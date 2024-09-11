require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const cookieParser = require("cookie-parser");
var jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middlewere

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dbn21dt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// const logger = (req, res, next) => {
//   console.log("From logger function", req.method, req.url);
//   next();
// };

const veryfyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(403).send({ message: "Forbidden" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "Forbidden" });
    }
    console.log(decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("usersDB").collection("services");
    const bookingCollection = client.db("usersDB").collection("booking");
    const productCollection = client.db("usersDB").collection("products");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.patch("/logout", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/service", async (req, res) => {
      const filter = req.query;
      const query = {};
      const options = {
        sort: {
          price: filter.sort === "ascen" ? 1 : -1,
        },
      };
      const cursor = serviceCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });
    app.get("/booking/:email", veryfyToken, async (req, res) => {
      const emails = req.params.email;
      console.log("Token owner", req.user?.user?.LoggedUser.email);
      if (emails !== req.user?.user?.LoggedUser.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const cursor = bookingCollection.find({ "newBooking.email": emails });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const data = req.query;
      const result = await productCollection.find(data).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server Is Runing With Full Speed");
});

app.listen(port, () => {
  console.log(`Our Port Is Run From ${port}`);
});
