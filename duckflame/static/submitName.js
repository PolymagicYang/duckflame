function load_newChannel(ChannelName, action) {
    const request = new XMLHttpRequest();
    request.open('GET', `channelInfo/${ ChannelName }`);
    request.onload = () => {
        const response = JSON.parse(request.responseText);
        var parentBar = document.querySelector("#messagebar");
        document.querySelectorAll("#mess").forEach(function(mes) {
            parentBar.removeChild(mes);
        });

        for (let elem in response) {
            const name = response[elem].name;
            if (name === "default") {
                break;
            }
            const content = response[elem].content;
            initMes(name, content, action);
        };
    };
    request.send();
};

function noticeUser(sender, receiver) {
    const noticeButt = document.querySelector("#Notice");
    noticeButt.textContent = sender;
    noticeButt.style = "background:red"
    noticeButt.id = "needClick"
};

function gotoButtom(id, action) {
    var element = document.querySelector(id);
    var pas1 = (action === "changeChannel");
    var pas2 = (element.scrollHeight - element.scrollTop <= 2 * element.offsetHeight);

    if (pas1 || pas2) {
          element.scrollTop = element.scrollHeight - element.clientHeight;
      };
};

function initChannel() {
    const request = new XMLHttpRequest();
    request.open('GET', "channelInfomation");

    request.onload = () => {
        const res = JSON.parse(request.response);

        for (let i = 0; i < res.length; i += 1) {
            if (res[0]["name"] === "default") {
                break;
            };
            load_newChannel(res[i]["ChannelName"], "changeChannel");
        };
        resAllChannels = JSON.parse(JSON.stringify(res.AllInfo));
        for (let elem in resAllChannels) {
            createNewChannel({"ChannelName": `${ elem }`});
        }

        load_newChannel("Public", "changeChannel");
    };
    request.send();
};

function createNewChannel(data) {
    const template = Handlebars.compile(document.querySelector('#CreateChannel').innerHTML);
    const ChannelName = data.ChannelName;
    const content = template({'ChannelName': ChannelName});

    document.querySelector('#channelBar').innerHTML += content;
};

function createNewUser(name) {
    const template = Handlebars.compile(document.querySelector('#createNewUser').innerHTML);
    const content = template({'userName': name});

    document.querySelector('#userBar').innerHTML += content;
};

function initMes(name, content, action) {
    const localName = document.querySelector("#name").textContent;
    name = name.toString().replace(/,/g, " ");
    content = content.toString().replace(/,/g, " ");
    let template;

    if (localName === name) {
        template = Handlebars.compile(document.querySelector("#usermesOfself").innerHTML);
    } else {
        template = Handlebars.compile(document.querySelector("#usermesOfothers").innerHTML);
    };

    const contents = template({'NameOfUser': name, 'messageContent': content});

    document.querySelector("#messagebar").innerHTML += contents;
    const sinMessage = document.querySelector("#singmessage");
    sinMessage.style.animationPlayState = "running";
    sinMessage.id = "looked";

    gotoButtom("#messagebar", action);
}

function createNewMess(name, content, action) {
    let template;
    const localName = document.querySelector("#name").textContent;

    name = name.toString().replace(/,/g, " ");
    content = content.toString().replace(/,/g, " ");

    if (localName === name) {
        template = Handlebars.compile(document.querySelector("#usermesOfself").innerHTML);
    } else {
        template = Handlebars.compile(document.querySelector("#usermesOfothers").innerHTML);
    };

    const contents = template({'NameOfUser': name, 'messageContent': content});

    document.querySelector("#messagebar").innerHTML += contents;
    const sinMessage = document.querySelector("#singmessage");
    sinMessage.style.animationPlayState = "running";

    document.addEventListener("animationend", elem => {
        elem.target.id = "looked";
        return false;
    });

    gotoButtom("#messagebar", action, action);
};

document.addEventListener("DOMContentLoaded", () => {
    initChannel();

    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    let flag = 1;
    let channelNow = 'Public';
    let userConnNow = 'no';
    let isInRoom = false;
    let roomNow = 'none';
    
    const name = document.querySelector("#name").textContent;
    socket.emit("newUserOnline", {"name": name});

    socket.on('connect', () => {
        if (flag === 1) {
            const name = document.querySelector("#name").textContent;
            socket.emit('sub name', {"name": name});
            flag = 0;
        }
    });

    socket.on("privateMesSend", data => {
        createNewMess(data.username, data.content, "sendMes");
    });

    socket.on("announce name", data => {
        const p = document.createElement('p');
        p.innerHTML = `${data.name}`;
        const users = document.querySelector("#onlineUser");
        if (users !== null) {
            users.append(p);
        };
    });

    socket.on("announce message", data => {
        let name = data.name;
        let content = data.content;
        let channel = data.ChannelName;

        if (channel === channelNow) {
            createNewMess(name, content, "MESS");
        };
    });

    socket.on("newUserOnlineNotice", data => {
        createNewUser(data.name);
    });

    socket.on("announce new Channel", data => {
        createNewChannel(data);
    });

    socket.on("connect Request", data => {
        if (name === data.receiver) {
            noticeUser(data.sender, data.receiver); 
        };
    });

    document.addEventListener('click', event => {
        const Info = event.target;
        if (Info.className === 'logout') {
            document.querySelectorAll('.onlineUser', forEach(function(head) {
                const name = querySelector("#name").textContent;

                if (head.textContent === name) {
                    head.remove();
                };
                socket.emit("logout", {"name": name});
            }));
        };

        if (Info.id === "newChannel") {
            const Channel = document.querySelector("#Channelname");
            const ChannelName = Channel.value;

            Channel.value = "";
            socket.emit("Create channel", {"ChannelName": ChannelName});
        };

        if (Info.id === "channel") {
            const channel = Info.textContent;
            channelNow = channel;
            const sendButt = document.querySelector("#privateMesSend");
            if (sendButt != null) {
                sendButt.id = "send";
            };
            
            isInRoom = false;
            userConnNow = "none";
            
            load_newChannel(channel, "changeChannel");
        };

        if (Info.id === "userChoosen") {
            const user = Info.textContent;
            if (user != userConnNow) {
                var parentBar = document.querySelector("#messagebar");
                    document.querySelectorAll("#mess").forEach(function(mes) {
                    parentBar.removeChild(mes);
                });
                userConnNow = user;
                if (isInRoom) {
                    socket.emit('leave', {"username": name, "room": roomNow});
                };
                roomNow = name;
                socket.emit('join', {"username": name, "room": name});
                socket.emit('connection request', {"room": roomNow, "receiver": userConnNow, "sender": name});
                isInRoom = true;
                const sendButt = document.querySelector("#send");
                if (sendButt != null) {
                    sendButt.id = "privateMesSend";
                };
            };
        };

        if (Info.id === "privateMesSend") {
            const content = document.querySelector("#content");
            const result = content.value;
            if (result.length === 0) {
                alert("content can not be empty!");
            } else {
                content.value = "";
                socket.emit("privateMesSend", {"username": name, "room": roomNow, "content": result});
            };
        };

        if (Info.id === "needClick") {
            userConnNow = Info.textContent;
            roomNow = userConnNow;
            Info.id = "Notice";
            Info.style = "";

            var parentBar = document.querySelector("#messagebar");
            document.querySelectorAll("#mess").forEach(function(mes) {
                parentBar.removeChild(mes);
            });
            if (isInRoom) {
                socket.emit('leave', {"username": name, "room": roomNow});
            };
            socket.emit('join', {"username": name, "room": roomNow});
            const sendButt = document.querySelector("#send");
                if (sendButt != null) {
                    sendButt.id = "privateMesSend";
                };
            isInRoom = true;
        };

        if (Info.id === "send") {
            const content = document.querySelector("#content");
            const result = content.value;
            if (result.length == 0) {
                alert("content can not be empty!");
            } else {
                const ChannelName = channelNow;
                const name = document.querySelector("#name").textContent;
                const date = Date.now();
                content.value = "";
                socket.emit("message", {"message": result, "ChannelName": ChannelName, "name": name, "date": date});
            };
        };
    });
});
