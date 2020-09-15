import os
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from flask import Flask, jsonify, render_template, request, session
from flask_socketio import SocketIO, emit
from flask_session import Session
from datetime import datetime, date
from flask_socketio import join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config['TEMPLATES_AUTO_RELOAD'] = True
socketio = SocketIO(app)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

engine = create_engine(os.getenv("DATABASE_URL"))
db = scoped_session(sessionmaker(bind=engine))

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

@app.route("/login", methods=['POST'])
def login():
	"""
	This can be used for login. all the sql statements have been created.
	You can change some details to satisfy your own needs.
	This is just a demo, and you can change it anyway.
	"""
	name = request.form.get('username')
	password = request.form.get('psw')
	userInfo = db.execute('SELECT * FROM "User" WHERE username = :username', {"username": name}).fetchone()
	if userInfo is None:
		return render_template("index.html")
	psw = userInfo.password
	if psw == password:
		if name in onlineUsers:
			return render_template("error.html", userName=name)
		userTemp = onlineUsers[:]
		onlineUsers.append(name)
		return render_template("mainPage.html", onlineUsers=userTemp, name=name, slf=name)
	return render_template("index.html")

@app.route("/duckflame", methods=['POST'])
def duckflame():
    name = request.form.get('name')
    if name in onlineUsers:
        return render_template("error.html", userName=name)
    userTemp = onlineUsers[:]
    onlineUsers.append(name)
    return render_template("mainPage.html", onlineUsers=userTemp, name=name, slf=name)

@app.route("/channelInfomation")
def getChannel():
    return jsonify(channel)

@app.route("/channelInfo/<string:ChannelName>")
def changeChannel(ChannelName):
    name = ChannelName.split()
    return channel[name[0]]

@socketio.on("privateMesSend")
def sendPrivate(data):
	username = data["username"]
	room = data["room"]
	content = data["content"]
	emit("privateMesSend", {"content": content, "username": username}, room=room);

@socketio.on("sub name")
def enter(data):
    name = data["name"]
    emit("announce name", {"name": name}, broadcast=True)

@socketio.on("connection request")
def conRequest(data):
	room = data["room"]
	receiver = data["receiver"]
	sender = data["sender"]
	emit("connect Request", {"room": room, "receiver": receiver, "sender": sender}, broadcast=True)

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

@socketio.on('join')
def on_join(data):
	username = data['username']
	room = data['room']
	join_room(room)
	emit("joinRoom", {"username": username}, room=room);
	
@socketio.on('leave')
def on_leave(data):
	username = data['username']
	room = data['room']
	leave_room(room)
	emit("leaveRoom", {"username": username}, room=room);
	
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
    emit("announce new Channel", { "ChannelName": channelN }, broadcast=True)

@socketio.on("newUserOnline")
def newUserOnlineNotice(data):
	emit("newUserOnlineNotice", { "name": data["name"] }, broadcast=True)
