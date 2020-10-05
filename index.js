const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-zero.xfaee.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 8080;

const serviceAccount = require("./config/fir-volunteer-network-firebase-adminsdk-8qi1w-979c5f5cae.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIRE_DB,
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    app.get("/", (req, res) => {
      const collection = client.db("volunteer-network").collection("events");
      const cursor = collection.find({});
      cursor.toArray((error, result) => {
        if (error) {
          res.send(error);
        } else {
          res.send(result);
        }
      });
    });

    app.get("/all-events", (req, res) => {
      const collection = client.db("volunteer-network").collection("events");
      const cursor = collection.find({});
      cursor.toArray((error, result) => {
        if (error) {
          res.send(error);
        } else {
          res.send(result);
        }
      });
    });

    app.get("/admin/volunteer-list", (req, res) => {
      const collection = client
        .db("volunteer-network")
        .collection("event-registrations");
      const cursor = collection.find({});
      cursor.toArray((error, result) => {
        if (error) {
          res.status(404).send(error);
        } else {
          res.status(200).send(result);
        }
      });
    });

    app.get("/volunteer-registered", (req, res) => {
      const regCollection = client
        .db("volunteer-network")
        .collection("event-registrations");
      const eventCollection = client
        .db("volunteer-network")
        .collection("events");
      const bearer = req.headers.authorization;
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        admin
          .auth()
          .verifyIdToken(idToken)
          .then((decodedToken) => {
            const tokenEmail = decodedToken.email;

            const cursorOne = regCollection.find({ email: tokenEmail });
            const cursorTwo = eventCollection.find();
            cursorOne.toArray((error, resultOne) => {
              if (!error) {
                cursorTwo.toArray((error, resultTwo) => {
                  if (!error) {
                    res.send({ regData: resultOne, eventDetails: resultTwo });
                  }
                });
              }
            });
          })
          .catch((err) => {
            res.send(err.errorInfo.code);
          });
      }
    });

    app.get("/admin/delete", (req, res) => {
      const queryData = req.query;
      const regCollection = client
        .db("volunteer-network")
        .collection("event-registrations");
      regCollection
        .deleteOne(queryData)
        .then((result) => {
          if (result.deletedCount > 0) {
            res.send({ successMsg: "Document deleted" });
          } else {
            res.status(404).send({ errMsg: "Invalid document" });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    });

    app.get("/delete-registration", (req, res) => {
      const receivedData = req.query;
      const bearer = req.headers.authorization;
      const regCollection = client
        .db("volunteer-network")
        .collection("event-registrations");
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        admin
          .auth()
          .verifyIdToken(idToken)
          .then((decodedToken) => {
            const tokenEmail = decodedToken.email;

            regCollection
              .deleteOne({
                eventName: receivedData.eventName,
                email: tokenEmail,
              })
              .then((result) => {
                if (result.deletedCount > 0) {
                  res
                    .status(200)
                    .send({ successMsg: "Document deleted Successfully" });
                } else {
                  res.status(404).send({ errMsg: "invalid credentials" });
                }
              })
              .catch((error) => {
                res.status(404).send(error);
                console.log(error);
              });
          })
          .catch((err) => {
            res.send(err.errorInfo.code);
          });
      }
    });

    app.post("/admin/add-event", (req, res) => {
      let eventData = req.body;
      const events = client.db("volunteer-network").collection("events");
      events
        .insertOne(eventData)
        .then((result) => {
          if (result.insertedCount === 1) {
            res.send(
              JSON.stringify({ successMsg: "Event created Successfully" })
            );
          }
        })
        .catch((error) => {
          res.send(error);
        });
    });

    app.post("/register-event", (req, res) => {
      let registrationData = req.body;
      const bearer = req.headers.authorization;
      if (bearer && bearer.startsWith("Bearer ")) {
        const idToken = bearer.split(" ")[1];
        admin
          .auth()
          .verifyIdToken(idToken)
          .then((decodedToken) => {
            const tokenEmail = decodedToken.email;
            if (tokenEmail === registrationData.email) {
              client
                .db("volunteer-network")
                .collection("event-registrations")
                .insertOne(registrationData, (error, result) => {
                  if (error) {
                    res.send(error);
                  } else {
                    res.send({
                      successMsg: "Successfully registered",
                    });
                  }
                });
            } else {
              res.send({ errMsg: "Invalid Credentials" });
            }
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        console.log("error");
      }
    });
  }
});

app.listen(port, () => {
  console.log("server started");
});
