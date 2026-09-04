"""Serveur de développement local.

Identique à `python -m http.server` mais renvoie systématiquement
Cache-Control: no-store. Sans ça, le navigateur garde les modules ES en cache
et continue d'exécuter l'ancien code après une modification, ce qui rend les
vérifications trompeuses.

Usage : python serve.py [port]   (port par défaut : 8000)
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # sortie silencieuse
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))
    print(f"Serveur de dev sur http://localhost:{port} (cache desactive)")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
