"""Simulate the visual folder picker and export-only user in local Edge."""
import json
import time
import urllib.request

import websocket


with urllib.request.urlopen("http://127.0.0.1:9230/json", timeout=5) as response:
    page = next(item for item in json.load(response) if item.get("type") == "page" and "127.0.0.1:8766" in item.get("url", ""))
ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=60)
counter = 0


def command(method, params=None):
    global counter
    counter += 1
    ws.send(json.dumps({"id": counter, "method": method, "params": params or {}}))
    while True:
        message = json.loads(ws.recv())
        if message.get("id") == counter:
            return message["result"]


def evaluate(expression, await_promise=False):
    result = command("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": await_promise})["result"]
    if result.get("subtype") == "error":
        raise RuntimeError(result.get("description"))
    return result.get("value")


command("Page.navigate", {"url": f"http://127.0.0.1:8766/index.html?fresh=visual-folder-test-{int(time.time())}"})
time.sleep(5)
folder_result = evaluate("""
(async()=>{
  sessionStorage.setItem('rlp_upload_admin','1');
  const specs=[
    ['PU-BUDGET.xls','pu-budget.xls'],['PU-MONTH-ACTUAL.xls','pu-month-actual.xls'],
    ['PU-DEPT-DEMAND-SMH-BUDGET.xls','pu-dept-demand-smh-budget.xls'],['PU-DEPT-DEMAND-SMH-ACTUAL.xls','pu-dept-demand-smh-actual.xls'],
    ['DEMAND-SMH-BUGDET.xls','demand-smh-budget.xls'],['DEMAND-SMH-ACTUAL.xls','demand-smh-actual.xls']
  ];
  const handles=[];
  for(const [name,urlName] of specs){
    const bytes=await (await fetch('data/mb-budget-sync/source-files/2026-2027/'+urlName,{cache:'no-store'})).arrayBuffer();
    const file=new File([bytes],name,{lastModified:Date.now()});
    handles.push({kind:'file',name,getFile:async()=>file});
  }
  window.showDirectoryPicker=async()=>({name:'PORTAL DATA TEST',async *values(){for(const h of handles)yield h;}});
  await choosePortalDataFolder();
  return JSON.stringify({status:document.getElementById('folderUploadStatus').textContent,state:document.getElementById('folderUploadStatus').className,files:document.querySelectorAll('.folder-file.ok').length,checks:portalValidationChecks(),fingerprint:exportDataFingerprint()});
})()
""", True)
print("folder", folder_result)
folder = json.loads(folder_result)
if "successfully" not in folder["status"] or folder["files"] != 6 or any(c["state"] == "err" for c in folder["checks"]):
    raise RuntimeError(f"Visual folder workflow failed: {folder}")

auth_result = evaluate("""
(async()=>{
  sessionStorage.removeItem('rlp_upload_admin');sessionStorage.removeItem('rlp_export_user_access');
  const blocked=confirmProtectedExport('Excel export')===false && !document.getElementById('exportLoginOverlay').classList.contains('hidden');
  _pendingExportLabel='';document.getElementById('exportLoginPwd').value='#1';await doExportLogin();window.confirm=()=>true;
  return JSON.stringify({blocked,exportAccess:isExportUserUnlocked(),adminAccess:isUploadAdminUnlocked(),confirmed:confirmProtectedExport('Excel export')});
})()
""", True)
print("auth", auth_result)
auth = json.loads(auth_result)
if not auth["blocked"] or not auth["exportAccess"] or auth["adminAccess"] or not auth["confirmed"]:
    raise RuntimeError(f"Export-only authorization failed: {auth}")
ws.close()
