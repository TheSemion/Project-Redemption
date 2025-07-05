import fs from "fs"

export function readDatabase() {
    const data = fs.readFileSync('database.json', 'utf-8')
    return JSON.parse(data)
}

export function writeDatabase(data) {
    fs.writeFileSync('database.json', JSON.stringify(data, null, 2))
}

export function addUser(user) {
    const db = readDatabase()
    db.users.push(user)
    writeDatabase(db)
}