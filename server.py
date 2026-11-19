import copy
import json
import math
import secrets
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse


ROOT = Path(__file__).resolve().parent
ROOMS = {}
LOCK = threading.RLock()
ROLE_NAMES = {"judge", "display", "team-a", "team-b"}
TEAM_ACTIONS = {
    "bid", "auction-pass", "auction-submit", "buzz", "team-answer",
    "charades-claim", "bomb-pass", "closest-submit",
}


def new_room_code():
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(5))
        if code not in ROOMS:
            return code


def room_state_for_role(room, role):
    state = copy.deepcopy(room["state"])
    if not state:
        return None
    game = state.get("currentGame")
    challenge = state.get("challenge")
    if not challenge or role == "judge":
        return state
    if game == "charades":
        actor_team = challenge.get("turn")
        role_team = 0 if role == "team-a" else 1 if role == "team-b" else None
        if challenge.get("mode") != "public" and role_team != actor_team:
            challenge.pop("word", None)
    if game == "closest" and role in ("team-a", "team-b"):
        guesses = challenge.get("guesses", [])
        other_team = 1 if role == "team-a" else 0
        if len(guesses) > other_team:
            guesses[other_team] = None
    if game == "closest" and not challenge.get("done"):
        challenge.pop("answer", None)
    if game == "connection" and not challenge.get("done"):
        challenge.pop("answer", None)
    if game == "bomb" and role in ("team-a", "team-b") and state.get("timer"):
        state["timer"] = {"active": bool(state["timer"].get("active"))}
    return state


def action_error(room, role, action, payload):
    if role not in ("team-a", "team-b"):
        return "هذا التحكم متاح من شاشة أحد الفريقين فقط."
    if action not in TEAM_ACTIONS:
        return "هذا الإجراء غير مسموح."
    state = room.get("state")
    if not state or state.get("screen") != "game":
        return "لا توجد لعبة نشطة الآن."
    challenge = state.get("challenge") or {}
    if challenge.get("done"):
        return "انتهى هذا التحدي."
    team = 0 if role == "team-a" else 1
    game = state.get("currentGame")

    if action == "bid":
        value = payload.get("value")
        if game != "auction" or challenge.get("phase") != "bidding" or challenge.get("turn") != team:
            return "ليس دور فريقكم للمزايدة."
        if type(value) is not int or value <= challenge.get("highestBid", 0):
            return "المزايدة يجب أن تكون رقمًا صحيحًا أعلى من المزايدة الحالية."
    elif action == "auction-pass":
        if game != "auction" or challenge.get("phase") != "bidding" or challenge.get("turn") != team:
            return "ليس دور فريقكم للانسحاب."
    elif action == "auction-submit":
        value = payload.get("count")
        if game != "auction" or challenge.get("phase") != "attempt" or challenge.get("highestTeam") != team or not (state.get("timer") or {}).get("active"):
            return "فريقكم ليس صاحب التحدي الحالي."
        if type(value) is not int or value < 0:
            return "أدخلوا عددًا صحيحًا غير سالب."
    elif action == "buzz":
        if game != "connection" or challenge.get("buzzed") is not None or challenge.get("lockedTeam") == team:
            return "لا يمكن لفريقكم الضغط على الجرس الآن."
    elif action == "team-answer":
        if game == "quick":
            if team != state.get("round", 0) % 2 or not (state.get("timer") or {}).get("active") or challenge.get("buzzed") is not None:
                return "ليس دور فريقكم للإجابة."
        elif game != "connection" or challenge.get("buzzed") is not None or challenge.get("lockedTeam") == team:
            return "لا يمكن طلب الإجابة الآن."
    elif action == "charades-claim":
        if game != "charades" or challenge.get("turn") != team or not (state.get("timer") or {}).get("active") or challenge.get("claimTeam") is not None:
            return "ليس دور فريقكم في التمثيل."
    elif action == "bomb-pass":
        if game != "bomb" or not (state.get("timer") or {}).get("active") or challenge.get("turn") != team:
            return "ليس دور فريقكم لتمرير القنبلة."
    elif action == "closest-submit":
        value = payload.get("guess")
        if game != "closest" or isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            return "التخمين غير صالح لهذا التحدي."
        guesses = challenge.get("guesses", [])
        if len(guesses) > team and guesses[team] is not None:
            return "تم إرسال تخمينكم بالفعل."
    return None


class PartyBoxHandler(BaseHTTPRequestHandler):
    server_version = "PartyBoxLocal/1.0"

    def log_message(self, _format, *_args):
        return

    def respond(self, status, value, content_type="application/json; charset=utf-8"):
        if isinstance(value, (dict, list)):
            data = json.dumps(value, ensure_ascii=False).encode("utf-8")
        elif isinstance(value, str):
            data = value.encode("utf-8")
        else:
            data = value
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def read_json(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 1_000_000:
                return None
            return json.loads(self.rfile.read(size).decode("utf-8"))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            return None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/poll":
            self.poll(parse_qs(parsed.query))
            return
        if parsed.path == "/api/qr":
            self.qr_code(parse_qs(parsed.query))
            return
        self.serve_file(parsed.path)

    def qr_code(self, query):
        room = query.get("room", [""])[0].upper()
        role = query.get("role", [""])[0]
        with LOCK:
            if room not in ROOMS or role not in ROLE_NAMES or role == "display":
                self.respond(404, {"error": "تعذر إعداد رمز QR لهذا الجهاز."})
                return
        try:
            import qrcode
            from qrcode.image.svg import SvgPathImage

            host_header = self.headers.get("Host", "127.0.0.1")
            host = urlparse(f"http://{host_header}").hostname or "127.0.0.1"
            if host in ("127.0.0.1", "localhost", "0.0.0.0"):
                host = local_ip()
            port = self.server.server_address[1]
            url = f"http://{host}:{port}/?screen={quote(role)}&room={quote(room)}"
            image = qrcode.make(url, image_factory=SvgPathImage, box_size=8, border=4)
            self.respond(200, image.to_string(encoding="unicode"), "image/svg+xml; charset=utf-8")
        except ImportError:
            self.respond(503, {"error": "مولّد رمز QR غير مثبت. شغّلوا python -m pip install -r requirements.txt."})

    def poll(self, query):
        code = query.get("room", [""])[0].upper()
        role = query.get("role", [""])[0]
        try:
            since = int(query.get("since", ["0"])[0])
            after = int(query.get("after", ["0"])[0])
        except ValueError:
            self.respond(400, {"error": "معلمات المزامنة غير صالحة."})
            return
        with LOCK:
            room = ROOMS.get(code)
            if not room:
                self.respond(404, {"error": "رمز الغرفة غير صالح أو انتهت الجلسة."})
                return
            if role not in ROLE_NAMES:
                self.respond(400, {"error": "نوع الشاشة غير صالح."})
                return
            room["online"][role] = time.time()
            actions = []
            if role == "judge":
                actions = [item for item in room["actions"] if item["id"] > after]
            online = [name for name, last_seen in room["online"].items() if time.time() - last_seen < 12]
            self.respond(200, {
                "revision": room["revision"],
                "state": room_state_for_role(room, role) if room["revision"] != since else None,
                "actions": actions,
                "online": online,
            })

    def do_POST(self):
        parsed = urlparse(self.path)
        body = self.read_json()
        if body is None:
            self.respond(400, {"error": "تعذر قراءة الطلب."})
            return
        if parsed.path == "/api/rooms":
            self.create_room()
        elif parsed.path == "/api/state":
            self.update_state(body)
        elif parsed.path == "/api/actions":
            self.queue_action(body)
        else:
            self.respond(404, {"error": "المسار غير موجود."})

    def create_room(self):
        with LOCK:
            code = new_room_code()
            ROOMS[code] = {"state": None, "revision": 0, "actions": [], "next_action": 1, "online": {}}
        self.respond(201, {"room": code})

    def update_state(self, body):
        code = str(body.get("room", "")).upper()
        if body.get("role") != "judge":
            self.respond(403, {"error": "تحديث حالة اللعبة متاح للحكم فقط."})
            return
        state = body.get("state")
        if not isinstance(state, dict) or not isinstance(state.get("teams"), list) or len(state["teams"]) != 2:
            self.respond(400, {"error": "حالة اللعبة غير صالحة."})
            return
        with LOCK:
            room = ROOMS.get(code)
            if not room:
                self.respond(404, {"error": "الغرفة غير موجودة."})
                return
            room["state"] = state
            room["revision"] += 1
            self.respond(200, {"revision": room["revision"]})

    def queue_action(self, body):
        code = str(body.get("room", "")).upper()
        role = body.get("role")
        action = body.get("action")
        payload = body.get("payload") or {}
        if not isinstance(payload, dict):
            self.respond(400, {"error": "بيانات الإجراء غير صالحة."})
            return
        with LOCK:
            room = ROOMS.get(code)
            if not room:
                self.respond(404, {"error": "الغرفة غير موجودة."})
                return
            error = action_error(room, role, action, payload)
            if error:
                self.respond(409, {"error": error})
                return
            item = {"id": room["next_action"], "role": role, "action": action, "payload": payload}
            room["next_action"] += 1
            room["actions"].append(item)
            if len(room["actions"]) > 500:
                room["actions"] = room["actions"][-250:]
            self.respond(202, {"accepted": True, "id": item["id"]})

    def serve_file(self, url_path):
        relative = unquote(url_path).lstrip("/") or "index.html"
        target = (ROOT / relative).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            self.respond(404, "الملف غير موجود.", "text/plain; charset=utf-8")
            return
        suffix = target.suffix.lower()
        content_type = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
        }.get(suffix, "application/octet-stream")
        try:
            self.respond(200, target.read_bytes(), content_type)
        except OSError:
            self.respond(500, "تعذر قراءة الملف.", "text/plain; charset=utf-8")


def local_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("192.0.2.1", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


if __name__ == "__main__":
    address = "0.0.0.0"
    port = 8000
    server = ThreadingHTTPServer((address, port), PartyBoxHandler)
    print(f"Party Box is ready: http://{local_ip()}:{port}")
    print("Keep this window open and let phones connect to the same Wi-Fi.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Party Box.")
        server.server_close()
