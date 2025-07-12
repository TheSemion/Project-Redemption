const socket = new WebSocket("https://project-redemption-production.up.railway.app/")
//let socket = new WebSocket("ws://localhost:3000")

window.addEventListener("DOMContentLoaded", () => {
    const clientNumber = localStorage.getItem("currentClient")

    fetch("/getContacts", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ clientNumber })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "ok") {
            const contacts = data.contacts

            const contactsList = document.getElementById("contactsList")

            contacts.forEach(contact => {
                let lastMessage = contact.lastMessage
                let lastMessageTime = contact.lastMessageTime

                let hourMinute

                if (lastMessage && lastMessageTime) {
                    let [day, month, year, time] = lastMessageTime.split('.')
                    let [hour, minute, second] = time.split(':')

                    hourMinute = `${hour}:${minute}`
                } else {
                    hourMinute = ``
                    lastMessage = ``
                }
                contactsList.innerHTML += `
                <button class="chatButton" onclick="changeChat(this)" data-phone="${contact.phoneNumber}">
                    <img src="/avatars/commonAvatar.png">
                    <div class="chat-container">
                        <span class="chat-title">${contact.username}</span>
                        <div class="lowerChat">
                            <span class="lastMessage">${lastMessage}</span>
                            <span class="lastMessageTime">${hourMinute}</span>
                        </div>
                    </div>
                </button>
                `
            })
        }
    })
})

function register() {
    const number = document.getElementById("numberInput").value
    const name = document.getElementById("nameInput").value
    const password = document.getElementById("passwordInput").value


    fetch('/register', {
        method: "POST",
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ number, name, password })
    })
    .then(response => response.json())
    .then(data => {
        let status = data.status
        let message = data.message

        if (status === "error") {
            console.log(`Помилка: ${message}`)
            document.getElementById("numberInput").value = ""
            document.getElementById("nameInput").value = ""
            document.getElementById("passwordInput").value = ""
        }

        if (status === "ok") {
            console.log(message)
            window.location.href = "/login.html"
        }
    })
}

function login() {
    const number = document.getElementById("numberInputL").value
    const password = document.getElementById("passwordInputL").value

    fetch('/login', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, password })
    })
    .then(response => response.json())
    .then(data => {
        let status = data.status
        let message = data.message
        let username = data.username

        if (status === "error") {
            console.log(`Помилка:${message}`)
        }
        if (status === "ok") {
            console.log(`Успішний вхід в аккаунт ${username}`)
            localStorage.setItem("currentClient", number)
            window.location.href = "/main.html"
        }
    })
}

const usernameInput = document.getElementById('contactFirstNameInput');
const phoneInput = document.getElementById('contactNumberInput');
const addButton = document.getElementById('addContactButton');


function checkInputs() {
  const isUsernameFilled = usernameInput.value.trim() !== '';
  const isPhoneFilled = phoneInput.value.trim() !== '';

  if (isUsernameFilled && isPhoneFilled) {
    addButton.disabled = false;
  } else {
    addButton.disabled = true;
  }
}
usernameInput.addEventListener('input', checkInputs);
phoneInput.addEventListener('input', checkInputs);

function addContact() {
    document.getElementById("modal").classList.add("visible")
}

function closeModal() {
    document.getElementById("modal").classList.remove("visible")
}

function addChat() {
    const name = document.getElementById("contactFirstNameInput").value
    const lastName = document.getElementById("contactLastNameInput").value
    const number = document.getElementById("contactNumberInput").value
    let clientNumber = localStorage.getItem("currentClient")

    fetch('/addContact', {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ name, lastName, number, clientNumber })
    })
    .then(response => response.json())
    .then(data => {
        let status = data.status
        let message = data.message

        if (status === "ok") {
            const contactsList = document.getElementById("contactsList");

            contactsList.innerHTML += `
            <button class="chatButton" onclick="changeChat(this)" data-phone="${data.phoneNumber}">
                <img src="/avatars/commonAvatar.png">
                <div class="chat-container">
                <span class="chat-title">${name} ${lastName}</span>
                <p class="lastMessage"></p>
                </div>
            </button>
            `;
            document.getElementById("modal").classList.remove("visible")
            document.getElementsByClassName("modalInput").value = ""

        }
    })
}

const inputContainer = document.getElementById('inputContainer');
const messageInput = document.getElementById('messageInput');

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  
  const scrollHeight = messageInput.scrollHeight;
  const maxHeight = parseFloat(getComputedStyle(messageInput).maxHeight);
  const newHeight = Math.min(scrollHeight, maxHeight);

  messageInput.style.height = newHeight + 'px';
  
  const baseHeight = 37; 
  const delta = newHeight - baseHeight;

  inputContainer.style.height = (54 + delta) + 'px';

});

function changeChat(btn) {
    let clientNumber = localStorage.getItem("currentClient")
    let contactPhoneNumber = btn.dataset.phone
    
    fetch("/changeChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPhoneNumber, clientNumber })
    })
    .then (response => response.json())
    .then (data => {
        const contactName = data.contactName

        let title = document.getElementById("upperChatTitle")
        
        title.textContent = contactName
    })
    localStorage.setItem("currentChatWith", contactPhoneNumber)
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data)

    switch (data.type) {
        case "sendMessage": {
            const sendBy = data.sendBy
            const sendTo = data.sendTo
            const message = data.message
            const time = data.time
            const chats = data.chats

            let chat = document.getElementById("messageContainer")

            let currentClient = localStorage.getItem("currentClient")

            if (currentClient === sendBy) {
                let messageExample = `
                <div class="message from-me">
                    ${message}
                    <span class="timeSpan">${time}</span>
                </div>
                `
                chat.innerHTML += messageExample
            } else if (currentClient === sendTo) {
                let messageExample = `
                <div class="message from-them">
                    ${message}
                    <span class="timeSpan">${time}</span>
                </div>
                `
                chat.innerHTML += messageExample
            }

            scrollToBottomIfNeeded(chat)

            let chatsList = document.getElementById("contactsList")

            chatsList.innerHTML = `<button id="addChatButton" onclick="addContact()">+</button>`

            chats.forEach(chat => {
                let lastMessageTime = chat.lastMessageTime
                let lastMessage = chat.lastMessage
                let contact = chat.username
                let hourMinute

                if (lastMessage && lastMessageTime) {
                    let [day, month, year, time] = lastMessageTime.split('.')
                    let [hour, minute, second] = time.split(':')
                    hourMinute = `${hour}:${minute}`
                } else {
                    hourMinute = ``
                    lastMessage = ``
                }

                chatsList.innerHTML += `
                    <button class="chatButton" onclick="changeChat(this)" data-phone="${chat.phoneNumber}">
                        <img src="/avatars/commonAvatar.png">
                        <div class="chat-container">
                        <span class="chat-title">${contact}</span>
                        <div class="lowerChat">
                            <span class="lastMessage">${lastMessage}</span>
                            <span class="lastMessageTime">${hourMinute}</span>
                        </div>
                        </div>
                    </button>
                `
            })
            chat.insertAdjacentHTML('afterbegin', messageExample);
            break;
        }
        case "addContact": {
            let sendBy = data.sendBy
            let sendTo = data.sendTo

            let currentClient = localStorage.getItem("currentClient")
            
            if (sendTo === currentClient) {
                const contactsList = document.getElementById("contactsList");

                contactsList.innerHTML += `
                <button class="chatButton" onclick="changeChat(this)" data-phone="${data.sendByNumber}">
                    <img src="/avatars/commonAvatar.png">
                    <div class="chat-container">
                    <span class="chat-title">${sendBy}</span>
                    <p class="lastMessage"></p>
                    </div>
                </button>
                `
            }
            break;
        }
        case "loadChat": {
            let messages = data.messages

            if (data.clientNumber === localStorage.getItem("currentClient")) {
                let chat = document.getElementById("messageContainer")
                chat.innerHTML = ""
                messages.forEach(msg => {
                    let sendBy = msg.sendBy
                    let sendTo = msg.sendMessageTo

                    if (sendBy === localStorage.getItem("currentClient")) {
                        let messageExample = `
                        <div class="message from-me">
                            ${msg.message}
                            <span class="timeSpan">${msg.time}</span>
                        </div>
                        `
                        chat.innerHTML += messageExample
                    } else {
                        let messageExample = `
                        <div class="message from-them">
                            ${msg.message}
                            <span class="timeSpan">${msg.time}</span>
                        </div>
                        `
                        chat.innerHTML += messageExample
                    }
                })
                scrollToBottomIfNeeded(chat)
            }
            break;
        }
    }
}


function sendMessage() {
    const messageInput = document.getElementById("messageInput")

    const sendMessageTo = localStorage.getItem("currentChatWith")

    const currentClient = localStorage.getItem("currentClient")

    messageInput.style.height = '37px';
    inputContainer.style.height = '54px';
    

    socket.send(JSON.stringify({ message: messageInput.value, messageTo: sendMessageTo, currentClient, type: "sendMessage" }))
    messageInput.value = ""
}

function scrollToBottomIfNeeded(container) {
    const needsScroll = container.scrollHeight > container.clientHeight;
    if (needsScroll) {
        container.scrollTop = container.scrollHeight;
    }
}