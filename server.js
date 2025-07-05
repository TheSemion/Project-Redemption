import { WebSocketServer } from "ws"
import http from "http"
import express from "express"
import path from "path"
import { fileURLToPath } from "url"

import { readDatabase, addUser, writeDatabase } from "./dbfunctions.js"
import { read } from "fs"

let clients = []

const PORT = procces.env.PORT
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let app = express()
app.use(express.static(path.resolve(__dirname, "static")))
app.use(express.json())
let server = new http.createServer(app)
const wss = new WebSocketServer({server})

wss.on("connection", (ws) => {
    console.log("Приєднано користувача")
    clients.push(ws)
    ws.on("message", (data) => {
        const dataParsed = JSON.parse(data)

        switch (dataParsed.type) {
            case "sendMessage": {
                let message = dataParsed.message
                let sendMessageTo = dataParsed.messageTo
                let currentClient = dataParsed.currentClient

                console.log(dataParsed)

                let db = readDatabase()

                let user = db.users.find(user => user.phoneNumber === currentClient)
                console.log(user)

                if (user) {
                    let contact = user.contacts.find(contact => contact.username === sendMessageTo)
                    console.log(contact)

                    if (contact) {
                        let contactNumber = contact.phoneNumber

                        let chatId = [String(currentClient), String(contactNumber)].sort().join('-')

                        let chat = db.chats.find(chat => chat.chatId === chatId)

                        console.log(chat)

                        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        let newMessage = {
                            message,
                            sendMessageTo: contactNumber,
                            sendBy: currentClient,
                            time
                        }

                        console.log(newMessage)

                        chat.messages.push(newMessage)

                        writeDatabase(db)

                        clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ message, sendBy: currentClient, sendTo: contactNumber, time, type: "sendMessage" }))
                            }
                        })
                    }
                }
            }
        }
    })
})

app.post('/register', (req, res) => {
    const name = req.body.name
    const number = req.body.number
    const password = req.body.password

    let db = readDatabase()

    let ifNumberIsUsed = db.users.some(user => user.phoneNumber === number)

    if (ifNumberIsUsed) {
        return res.send({ status: "error", message: "Номер вже зайнятий" })
    }

    let user = {
        name: name,
        phoneNumber: number,
        password: password,
        contacts: [],
        chatsIn: []
    }

    addUser(user)

    console.log("Додано користувача", user)

    res.send({ status: "ok", message: "Успішно додано користувача" })
})

app.post('/login', (req,res) => {
    const number = req.body.number
    const password = req.body.password

    let db = readDatabase()

    let user = db.users.find(user => user.phoneNumber === number)

    if (!user) {
        return res.send({ status:"error", message:"За номером аккаунт не знайдено" })
    }

    if (user.password === password) {
        console.log("Вхід в аккаунт успішний")
        let name = user.name
        res.send({ status:"ok", message: "Вхід в аккаунт успішний", username: name })
    } else {
        return res.send({ status:"error", message: "Пароль невірний" })
    }
})


app.post('/addContact', (req, res) => {
    const name = req.body.name
    const lastName = req.body.lastName
    const phoneNumber = req.body.number
    const clientNumber = req.body.clientNumber

    let db = readDatabase()

    let user = db.users.find(user => user.phoneNumber === clientNumber)

    if (lastName === undefined) {
        lastName === ""
    }

    if (user) {
        let contact = db.users.find(user => user.phoneNumber === phoneNumber)
        console.log("Шукаємо контакт")

        if (contact) {
            console.log("Контакт знайдено")
            let username = `${name} ${lastName}`
            let newContactForMe = {
                username,
                phoneNumber
            }

            let newContactForHim = {
                username: user.name,
                phoneNumber: user.phoneNumber
            }

            console.log(newContactForMe)

            let chatId = [String(phoneNumber), String(clientNumber)].sort().join('-');

            let newChat = {
                users: [phoneNumber, clientNumber],
                chatId: chatId,
                messages: []
            }

            console.log(newChat)

            db.chats.push(newChat)
            console.log(db.chats)
            console.log(user.contacts)
            user.contacts.push(newContactForMe)
            contact.contacts.push(newContactForHim)
            writeDatabase(db)
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ sendBy: user.name, sendTo: contact.phoneNumber, type: "addContact"  }))
                }
            })
            res.send({ status: "ok", message: "Додано контакт" })
        } else {
            return res.send({ status: "error", message: "Користувача не знайдено" })
        }
    }
})

app.post("/changeChat", (req, res) => {
    let clientNumber = req.body.clientNumber
    let contactName = req.body.contactName

    let db = readDatabase()

    let user1 = db.users.find(user => user.phoneNumber === clientNumber)

    let clientName = user1.name
    
    let user2 = user1.contacts.find(contact => contact.username === contactName)
    let contactNumber = user2.phoneNumber

    let chatId = [String(clientNumber), String(contactNumber)].sort().join('-')

    let chat = db.chats.find(chat => chat.chatId === chatId)

    let messages = chat.messages

    if (messages !== "") {
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ messages, clientNumber, contactName, type: "loadChat" }))
            }
        })
    }
})

app.post("/getContacts", (req,res) => {
    let clientNumber = req.body.clientNumber

    let db = readDatabase()

    let user = db.users.find(u => u.phoneNumber === clientNumber)

    res.send({ status: "ok", contacts: user.contacts })
})

server.listen(PORT, () => {
    console.log("Сервер запущено")
})