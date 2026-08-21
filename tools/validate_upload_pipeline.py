"""Drive all six browser upload controls through Edge DevTools and validate apply."""
import json
from pathlib import Path
import time
import urllib.request

import websocket


PORT = 9230
SOURCE = Path(r"C:\Users\HP\Downloads\PORTAL DATA")
UPLOADS = [
    ("inp-budget-cy", "dz-budget-cy-status", "PU-BUDGET.xls"),
    ("inp-month-cy", "dz-month-cy-status", "PU-MONTH-ACTUAL.xls"),
    ("inp-smhbudget-cy", "dz-smhbudget-cy-status", "PU-DEPT-DEMAND-SMH-BUDGET.xls"),
    ("inp-smhmonth-cy", "dz-smhmonth-cy-status", "PU-DEPT-DEMAND-SMH-ACTUAL.xls"),
    ("inp-demandsmhbudget-cy", "dz-demandsmhbudget-cy-status", "DEMAND-SMH-BUGDET.xls"),
    ("inp-demandsmhactual-cy", "dz-demandsmhactual-cy-status", "DEMAND-SMH-ACTUAL.xls"),
]


with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=5) as response:
    target = next(item for item in json.load(response) if item.get("type") == "page" and "127.0.0.1:8766" in item.get("url", ""))
ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=30)
counter = 0


def command(method, params=None):
    global counter
    counter += 1
    ws.send(json.dumps({"id": counter, "method": method, "params": params or {}}))
    while True:
        message = json.loads(ws.recv())
        if message.get("id") == counter:
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})


def evaluate(expression, await_promise=False):
    result = command("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": await_promise})
    value = result.get("result", {})
    if value.get("subtype") == "error":
        raise RuntimeError(value.get("description"))
    return value.get("value")


command("Runtime.enable")
command("DOM.enable")
command("Page.navigate", {"url": f"http://127.0.0.1:8766/index.html?fresh=autoexport-upload-test-{int(time.time())}"})
time.sleep(5)
evaluate("sessionStorage.setItem('rlp_upload_admin','1')")

for upload_index, (input_id, status_id, filename) in enumerate(UPLOADS):
    document = command("DOM.getDocument", {"depth": -1})["root"]["nodeId"]
    node_id = command("DOM.querySelector", {"nodeId": document, "selector": f"#{input_id}"})["nodeId"]
    if not node_id:
        raise RuntimeError(f"Missing upload input: {input_id}")
    command("DOM.setFileInputFiles", {"nodeId": node_id, "files": [str(SOURCE / filename)]})
    deadline = time.time() + 30
    status = ""
    while time.time() < deadline:
        status = evaluate(f"(document.getElementById('{status_id}')||{{}}).textContent||''") or ""
        if "Parsed" in status or "Error" in status or "Cannot" in status or "No " in status:
            break
        time.sleep(.5)
    print(filename, "=>", status)
    if "Parsed" not in status:
        raise RuntimeError(f"Browser parser failed for {filename}: {status}")
    if upload_index == 0:
        pending_block = evaluate("(()=>{try{prepareFreshExport('Pending-test');return 'FAILED'}catch(e){return e.message}})()")
        if "parsed but not applied" not in pending_block:
            raise RuntimeError(f"Stale export was not blocked while upload was pending: {pending_block}")
        print("Pending export guard =>", pending_block)

evaluate("applyUploads()")
time.sleep(5)
summary = evaluate("(()=>{const ai=buildAITrendItems();return JSON.stringify({checks:portalValidationChecks(),fingerprint:exportDataFingerprint(),month:getMonthStatus(),ai:{rows:ai.length,completedThrough:ai[0]&&ai[0].actualMonthLabel,topScore:ai[0]&&ai[0].riskScore,topConfidence:ai[0]&&ai[0].confidence},budget:BUDGET.TOTAL,monthTotal:MONTH.TOTAL,detailRows:(window.DETAIL_SMH_DATA.rows||[]).length,demandRows:(window.DEMAND_SMH_SUMMARY_DATA.rows||[]).length,history:_uploadHistory.slice(0,6)})})()")
print(summary)
parsed = json.loads(summary)
errors = [check for check in parsed["checks"] if check["state"] == "err"]
if errors:
    raise RuntimeError(f"Portal validation errors after upload: {errors}")
if parsed["detailRows"] != 905 or parsed["demandRows"] != 12:
    raise RuntimeError(f"Unexpected applied row counts: {parsed['detailRows']} detail, {parsed['demandRows']} demand")
if parsed["ai"]["completedThrough"] != "JUL" or not isinstance(parsed["ai"]["topScore"], int):
    raise RuntimeError(f"AI analysis is not using completed-month scoring: {parsed['ai']}")
ws.close()
