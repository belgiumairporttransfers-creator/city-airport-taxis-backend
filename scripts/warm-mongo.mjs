import { MongoMemoryServer } from "mongodb-memory-server";

const server = await MongoMemoryServer.create();
await server.stop();
console.log("MongoDB memory server binary ready");
