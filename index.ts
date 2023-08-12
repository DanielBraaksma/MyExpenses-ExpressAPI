import express, { Request, Response } from "express";
const cors = require("cors");
import pgPromise from "pg-promise";
import bodyParser from "body-parser";
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3002;

const pgp = pgPromise();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const connectionString = process.env.DB_CONNECTION_STRING!;
const db = pgp(connectionString);
console.log(db);

// Register Route --DONE
app.post("/register", async (req, res) => {
  const email = req.body.email;
  const pass = req.body.password;
  const name = req.body.name;

  try {
    // Check if user already exists
    const checkUserQuery = "SELECT * FROM users WHERE email = $1";
    const existingUser = await db.oneOrNone(checkUserQuery, email);

    if (existingUser) {
      return res.status(400).send({ message: "Email already exists" });
    }

    // Insert new user into database
    const insertUserQuery =
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *";
    const newUser = await db.one(insertUserQuery, [name, email, pass]);

    res.status(200).send({ result: newUser });
    console.log(newUser);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error");
  }
});

// Login Route --DONE

const jwtPrivateSecret = process.env.JWT_SECRET;

app.post("/Login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await db.oneOrNone(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign({ user: user.id }, jwtPrivateSecret);
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/****DONE ****/
app.get("/bills", async (req: Request, res: Response) => {
  const Token = req.headers["authorization"];
  let decoded = jwt.decode(Token, { complete: true });
  const userId = decoded.payload.user;

  const query = `SELECT * FROM bills WHERE user_id = ${userId}`;

  const bills = await db.any(query);

  console.log(bills); // Print the results to the console

  res.send(bills); // Return the results as JSON in the HTTP response
});

/****DONE ****/
app.post("/addBill", async (req: Request, res: Response) => {
  const Token = req.headers["authorization"];
  let decoded = jwt.decode(Token, { complete: true });
  const userId = decoded.payload.user;
  const { name, amount, date, category } = req.body;

  const insertQuery = `
    INSERT INTO bills (name, amount, date, category, user_id)
    VALUES ($1, $2, $3, $4, $5)
  `;

  try {
    await db.none(insertQuery, [name, amount, date, category, userId]);
    res
      .status(201)
      .json({ success: true, message: "Bill created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create bill" });
  }
});

/****DONE ****/
app.delete("/bills/:id", async (req: Request, res: Response) => {
  const Token = req.headers["authorization"];
  let decoded = jwt.decode(Token, { complete: true });
  const userId = decoded.payload.user;

  console.log(req.params);
  const id = req.params.id;
  const query = `DELETE FROM bills WHERE id = $1 AND user_id = $2;`;
  try {
    await db.none(query, [id, userId]);
    res
      .status(201)
      .json({ success: true, message: "Bill deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting bill");
  }
});

/****DONE ****/
app.put("/bills/:id", async (req: Request, res: Response) => {
  const Token = req.headers["authorization"];
  let decoded = jwt.decode(Token, { complete: true });
  const userId = decoded.payload.user;

  const id = req.params.id;
  const { name, amount, date, category } = req.body;
  const query = `
    UPDATE bills
    SET name = $1, amount = $2, date = $3, category = $4
    WHERE id = $5 AND user_id = $6
  `;
  try {
    await db.none(query, [name, amount, date, category, id, userId]);
    res.status(200).send("Bill updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating bill");
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

/******* EVERYTHING BELOW IS FOR TESTING/DB MNGMT */

app.get("/users", async (req: Request, res: Response) => {
  const selectQuery = `
    SELECT *
    FROM users
  `;
  const users = await db.any(selectQuery);

  console.log(users); // Print the results to the console

  res.send(users); // Return the results as JSON in the HTTP response
});

app.get("/update", async (req: Request, res: Response) => {
  try {
    const selectQuery = `
    SELECT * FROM users;
    `;

    // const selectQuery = `
    // UPDATE bills
    // SET user_id = 860880534119710721
    // WHERE id = 860888514686681089;
    // ;
    // `;

    const users = await db.any(selectQuery); // Execute the SQL query to select all rows

    console.log(users); // Print the results to the console

    res.send(users); // Return the results as JSON in the HTTP response
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error");
  }
});

// });
// const createTableQuery = `
//   CREATE TABLE IF NOT EXISTS bills (
//     id SERIAL PRIMARY KEY,
//     name TEXT NOT NULL,
//     amount INTEGER NOT NULL,
//     date TIMESTAMP NOT NULL,
//     category TEXT NOT NULL
//   )
// `;

// try {
//   await db.none(createTableQuery); // Execute the SQL query to create the new table
//   console.log('Bills table created successfully');

//   const insertQuery = `
//     INSERT INTO bills (name, amount, date, category)
//     VALUES ($1, $2, $3, $4)
//   `;
//   const bill = {
//     name: 'Water Bill',
//     amount: 100,
//     date: new Date('2023-01-01'),
//     category: "utility"
//   };
//   await db.none(insertQuery, [bill.name, bill.amount, bill.date, bill.category]); // Execute the SQL query to insert a new bill

//   console.log('New bill inserted successfully');
//   res.send('New bill inserted successfully');
// } catch (error) {
//   console.error('Error:', error);
//   res.status(500).send('Error');
// }
//   });
