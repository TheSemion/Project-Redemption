import mongoose from "mongoose"

await mongoose.connect("mongodb+srv://ostapsemionyk1403:ostap1234S%21@projectredemption.ytzticc.mongodb.net/ProjectRedemption");
// === 🧱 Схеми ===

const userSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  password: String,
  contacts: Array,
});

const chatSchema = new mongoose.Schema({
  users: Array,
  chatId: String,
  messages: Array,
  lastMessageTime: String
});

const messageSchema = new mongoose.Schema({
  message: String,
  sendMessageTo: String,
  sendBy: String,
  time: String
});

const contactSchema = new mongoose.Schema({
  username: String,
  phoneNumber: String,
  lastMessage: String,
  lastMessageTime: String
}); 


// === 🏭 Моделі ===

const User = mongoose.model("User", userSchema);
const Chat = mongoose.model("Chat", chatSchema);
const Message = mongoose.model("Message", messageSchema);
const Contact = mongoose.model("Contact", contactSchema);
// === 📤 Читання всієї бази ===

export async function readDatabase() {
  const users = await User.find();
  const chats = await Chat.find();
  const messages = await Message.find();
  const contacts = await Contact.find();

  return { users, chats, messages, contacts };
}

// === 💾 Перезапис всієї бази ===

export async function writeDatabase(data) {
  await User.deleteMany();
  await Chat.deleteMany();
  await Message.deleteMany();
  await Contact.deleteMany();

  await User.insertMany(data.users || []);
  await Chat.insertMany(data.chats || []);
  await Message.insertMany(data.messages || []);
  await Contact.insertMany(data.contacts || []);
}

// === Додаткові функції (якщо треба) ===

export async function addUser(user) {
  await User.create(user);
}

export async function addMessage(message) {
  await Message.create(message);
}
