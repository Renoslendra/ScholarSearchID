"""Flask entry point for ScholarSearchID."""

from flask import Flask, render_template, request

app = Flask(__name__)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search")
def search():
    return render_template("search.html")


@app.route("/citation")
def citation():
    return render_template("citation.html")


@app.route("/lab")
def lab():
    return render_template("lab.html")


@app.route("/library")
def library():
    return render_template("library.html")


@app.route("/signin")
def signin():
    return render_template("about.html")


@app.route("/profile")
def profile():
    return render_template("profile.html")


@app.route("/profile/edit")
def profile_edit():
    return render_template("profile_edit.html")


@app.route("/register")
def register():
    return render_template("register.html")


if __name__ == "__main__":
    app.run(debug=True)
