import os
import requests

from flask import Flask, jsonify, render_template, request, session
from flask_socketio import SocketIO, emit
from flask_session import Session
from datetime import datetime, date

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config['TEMPLATES_AUTO_RELOAD'] = True
socketio = SocketIO(app)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

channel = {}
onlineUsers = []
channel["Public"] = {}
channel["AllInfo"] = {}
AllInfo = channel["AllInfo"]
AllInfo["Public"] = "Public"
initChannel = {
    "ChannelName": "Public",
    "name": "default",
    "content": "default"
}
initTime = "_1_"
channel["Public"][initTime] = initChannel


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/duckflame", methods=['POST'])
def duckflame():
    name = request.form.get('name')
    if name in onlineUsers:
        render_template("error.html", userName=name)
    Session["name"] = name
    onlineUsers.append(name)
    return render_template("mainPage.html", names=onlineUsers, name=name, slf=name)

@app.route("/channelInfomation")
def getChannel():
    return jsonify(channel)

@app.route("/channelInfo/<string:ChannelName>")
def changeChannel(ChannelName):
    name = ChannelName.split()
    return channel[name[0]]

@socketio.on("sub name")
def enter(data):
    name = data["name"]
    emit("announce name", {"name": name}, broadcast=True)

@socketio.on("message")
def send(data):
    """
    TODO: Channel can sorted by data/time.
    """
    content = data["message"].split()
    name = data["name"].split()
    time = data["date"]
    ChannelName = data["ChannelName"].replace(" ", "").split()

    userMes = channel[ChannelName[0]]

    if time not in userMes:
        userMes[time] = {}
    userMes[time]["name"] = name
    userMes[time]["content"] = content
    userMes[time]["ChannelName"] = ChannelName[0]
    if initTime in userMes:
        del userMes[initTime]

    emit("announce message", {"name": name, "content": content, "ChannelName": ChannelName[0]}, broadcast=True)

@socketio.on("logout")
def logout(data):
    onlineUsers.remove(date.name)
    Session.remove(data.name)
    return render_template("index.html")

@socketio.on("Create channel")
def createC(data):
    channelN = data["ChannelName"].replace(" ", "").split()
    channel[channelN[0]] = {}
    AllInfo[channelN[0]] = channelN
    print(channelN)
    emit("announce new Channel", { "ChannelName": channelN }, broadcast=True)
