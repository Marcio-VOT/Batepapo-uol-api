import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const PORT = 5000;

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db

try {
await mongoClient.connect();
db = mongoClient.db();
} catch (err) {
console.log("Erro no mongo.conect", err.message);
}

const app = express();
app.use(cors());
app.use(express.json());



//const participantsColection = db.collection("participants");
//const messagesColection = db.collection("messages");

setInterval(afkRemover, 15000);

app.post('/participants', async (req,res)=>{
    const {name} = req.body;

    const schema = joi.object({name: joi.string().required()})

    try {
        const validation = schema.validate({name}, { abortEarly: false })
        if(validation.error){
            return res.sendStatus(422);
        }
        const usedName = await db.collection("participants").findOne({name}, {name:1, _id:0, lastStatus:0});
        console.log(usedName)
        if(usedName){
            return res.sendStatus(409);
        }
        
        await db.collection("participants").insertOne({name, lastStatus : Date.now()});

        db.collection("messages").insertOne({from:name, to:'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(error)
    }
})

app.get('/participants', async (req,res)=>{
    try {
        const process = await db.collection("participants").find().toArray();
        res.send(process);
    } catch (error) {
        
    }
})

app.post('/messages', async (req, res)=>{
    const { to, text, type} = req.body;
    const user = req.headers.user
    const schema = joi.object({
        to : joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message','private_message').required(),
    })
    try {   
        const validation = schema.validate({to, text, type});
        const userExist = await db.collection("participants").findOne({name:user},{name:1, _id:0});
        if(!userExist || validation.error){
            return res.sendStatus(422)
        }
        await db.collection("messages").insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss')});

        res.sendStatus(201);
    } catch (error) {
        
    }
})

app.get('/messages/:limit?', async (req, res)=>{
    const { to, text, type} = req.body;
    const user = req.headers.user;
    const limit = req.params.limit  

    const schema = joi.object({
        limit: joi.number().positive().min(1)
    })
    
    try {   
        //let temp = await db.collection("messages").insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss')});
        let messagesList = await db.collection("messages").find({}).toArray();

        messagesList = messagesList.filter((msg)=> (msg.from === user || msg.to === user || msg.type === "message" || msg.type === "status"))
        const verification = schema.validate({limit});
        
        if(verification.error){
            return res.sendStatus(422);
        }else if(limit){
        return res.send(messagesList.slice(-limit));
        }
        res.send(messagesList);
    } catch (error) {
        
    }
})

app.post('/status', async (req, res)=>{
    const user = req.headers.user;

    try {
        const userUpdate = (await db.collection("participants").updateOne({name:user}, {$set: {lastStatus: Date.now()}})).matchedCount;
        if(userUpdate === 0){
            return res.sendStatus(404);
        }
        res.sendStatus(200);
    } catch (error) {
        
    }
})

async function afkRemover() {
    const afkUsers = await db.collection("participants").find({lastStatus : {$lt: Date.now()-10000}}, {_id: 0, name: 1}).toArray();
    afkUsers.map(({name})=>{
        db.collection("participants").deleteOne({name});
        db.collection("messages").insertOne({from:name, to:'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
    })
}
 
app.listen(PORT, () => console.log(`Server running in port: ${PORT}`));