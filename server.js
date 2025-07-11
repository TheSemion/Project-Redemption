import { WebSocketServer, WebSocket } from "ws"
import http from "http"
import express from "express"
import path from "path"
import { fileURLToPath } from "url"

import { readDatabase, addUser, writeDatabase } from "./dbfunctions.js"
import { read } from "fs"

let clients = []

const PORT = process.env.PORT
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
    ws.on("message", async (data) => {
        const dataParsed = JSON.parse(data)

        switch (dataParsed.type) {
            case "sendMessage": {
                let message = dataParsed.message
                let sendMessageTo = dataParsed.messageTo
                let currentClient = dataParsed.currentClient

                if (message.trim() === "") {
                    return
                }

                console.log(dataParsed)

                let db = await readDatabase()

                let user = db.users.find(user => user.phoneNumber === currentClient)
                console.log(user)

                if (user) {
                    let contact = user.contacts.find(contact => contact.phoneNumber === sendMessageTo)
                    console.log(contact)

                    if (contact) {
                        let contactNumber = contact.phoneNumber

                        let chatId = [String(currentClient), String(contactNumber)].sort().join('-')

                        let chat = db.chats.find(chat => chat.chatId === chatId)

                        console.log(chat)

                        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

                        const now = new Date()

                        const day = String(now.getDate()).padStart(2, '0')        // день з ведучим нулем
                        const month = String(now.getMonth() + 1).padStart(2, '0') // місяць (0-based) +1 і з нулем
                        const year = now.getFullYear()

                        const hours = String(now.getHours()).padStart(2, '0')     // години з нулем
                        const minutes = String(now.getMinutes()).padStart(2, '0')
                        const seconds = String(now.getSeconds()).padStart(2, '0')
                         // хвилини з нулем

                        const lastMessageTime = `${day}.${month}.${year}.${hours}:${minutes}:${seconds}`

                        let contactUser = db.users.find(u => u.phoneNumber === contactNumber)


                        let newMessage = {
                            message,
                            sendMessageTo: contactNumber,
                            sendBy: currentClient,
                            time
                        }

                        console.log(newMessage)

                        chat.messages.push(newMessage)
                        chat.lastMessageTime = lastMessageTime

                        contact.lastMessage = message
                        contact.lastMessageTime = lastMessageTime

                        let contactFromHim = contactUser.contacts.find(contact => contact.phoneNumber === user.phoneNumber)
                        
                        contactFromHim.lastMessage = message
                        contactFromHim.lastMessageTime = lastMessageTime

                        await writeDatabase(db)

                        let chats = sortChatsByLastMessage(user.contacts)

                        console.log("currentClient:", currentClient)
                        console.log("contact:", contact)
                        console.log("contact.username:", contact?.username)

                        clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ message, sendBy: currentClient, sendTo: contactNumber, time, type: "sendMessage", chats, contact: sendMessageTo }))
                            }
                        })
                    }
                }
            }
        }
    })
})

app.post('/register', async (req, res) => {
    const name = req.body.name
    const number = req.body.number
    const password = req.body.password

    let db = await readDatabase()

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

    await addUser(user)

    console.log("Додано користувача", user)

    res.send({ status: "ok", message: "Успішно додано користувача" })
})

app.post('/login', async (req,res) => {
    const number = req.body.number
    const password = req.body.password

    let db = await readDatabase()

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


app.post('/addContact', async (req, res) => {
    const name = req.body.name
    const lastName = req.body.lastName
    const phoneNumber = req.body.number
    const clientNumber = req.body.clientNumber

    let db = await readDatabase()

    let user = db.users.find(user => user.phoneNumber === clientNumber)

    if (lastName === undefined) {
        lastName = ""
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

            await writeDatabase(db)
            
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ sendBy: user.name, sendByNumber: user.phoneNumber, sendTo: contact.phoneNumber, type: "addContact", phoneNumber  }))
                }
            })
            res.send({ status: "ok", message: "Додано контакт" })
        } else {
            return res.send({ status: "error", message: "Користувача не знайдено" })
        }
    }
})

app.post("/changeChat", async (req, res) => {
    let clientNumber = req.body.clientNumber
    let contactNumber = req.body.contactPhoneNumber

    let db = await readDatabase()

    let user1 = db.users.find(user => user.phoneNumber === clientNumber)
    if (!user1) {
        return res.status(404).send({ status: "error", message: "Користувача не знайдено" })
    }

    let user2 = user1.contacts.find(contact => contact.phoneNumber === contactNumber)

    let contactName = user2.username
    if (!user2) {
        console.log(`Контакт '${contactNumber}' не знайдено у користувача ${clientNumber}`)
        return res.status(404).send({ status: "error", message: "Контакт не знайдено" })
    }


    console.log("user2, contactNumber", user2, contactNumber)

    let chatId = [String(clientNumber), String(contactNumber)].sort().join('-')

    let chat = db.chats.find(chat => chat.chatId === chatId)
    if (!chat) {
        return res.status(404).send({ status: "error", message: "Чат не знайдено" })
    }

    let messages = chat.messages

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ messages, clientNumber, contactName, type: "loadChat" }))
        }
    })

    res.send({ status: "ok", message: "Чат надіслано", contactName }) // важливо відповісти клієнту
})


app.post("/getContacts", async (req,res) => {
    let clientNumber = req.body.clientNumber

    let db = await readDatabase()

    let user = db.users.find(u => u.phoneNumber === clientNumber)

    if (!user) {
        return res.send({ status: "error", message: "Користувача не знайдено" })
    }

    let contacts = await sortChatsByLastMessage(user.contacts)

    if (user.contacts) {
        res.send({ status: "ok", contacts })
    } else {
        return
    }

})

function getDate(str) {
    if (!str || typeof str !== "string" || !str.includes('.') || !str.includes(':')) {
        return null
    }

    try {
        const [day, month, year, time] = str.split('.')
        const [hours, minutes, seconds] = time.split(':')
        return new Date(+year, +month - 1, +day, +hours, +minutes, +seconds)
    } catch (err) {
        console.log("Помилка в getDate:", err)
        return null
    }
}

function sortChatsByLastMessage(chats) {
    return chats.sort((a,b) => {
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1

        const dateA = getDate(a.lastMessageTime)
        console.log(dateA)
        const dateB = getDate(b.lastMessageTime)
        console.log(dateB)

        return dateB - dateA
    })
}

server.listen(3000, () => {
    console.log("Сервер запущено")
})