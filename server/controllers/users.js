const { db } = require('../config/mysql.js');
const bcrypt = require('bcrypt');

const { inRange } = require('../utils');
const { sendServerError } = require('./concerns');
const ROUNDS = 10;

// Codes
// =======================
// 401 : Unauthorized
// 409 : Conflict

function setSessionRole(req, role, userId) {
  req.session.userId = userId;
  req.session.admin = false;
  req.session.team = false;
  switch (role) {
    case 'users':
      req.session.admin = true;
      break;
    case 'teams':
      req.session.team = true;
      break;
  }
}

module.exports = {
  registerAdmin: (req, res, next, role = 'users') => {
    const {
      name,
      password,
      confirmPassword,
      mattermost,
      permission,
    } = req.body;

    const errors = {};

    if (permission !== process.env.ADMINKEY)
      errors.permission = 'Your permission key was incorrect';
    if (!inRange(name.length, 5, 32))
      errors.name = 'User name must be 5 to 32 characters.';
    if (password.length < 8)
      errors.password = 'Password must be at least 8 characters';
    else if (password !== confirmPassword)
      errors.password = 'Passwords do not match';

    if (Object.keys(errors).length) {
      return res.status(409).json({ errors });
    }

    console.log("role",role);
    
    const query = `SELECT id FROM ${role} WHERE name = ?`;
    console.log("The query", query);
    db.query(query, req.body.name, (err, users) => {
      if (err) return sendServerError(err, res);
      if (users.length > 0) errors.name = name + ' is already taken';
      if (Object.keys(errors).length == 0) createUser(req.body);
      else res.status(409).json({ errors: errors });
    });

    function createUser(user) {
      console.log("the user", user)
      bcrypt.hash(user.password, ROUNDS, (err, hash) => {
        const query =
          'INSERT INTO users (name, password, location, mattermost) VALUES (?, ?, ?, ?)';
        const userData = [user.name, hash, user.location, user.mattermost];
        db.query(query, userData, (err, packet) => {
          if (err) return sendServerError(err, res);
          setSessionRole(req, role, packet.insertId);
          res.json({ userId: packet.insertId });
        });
      });
    }
  },

  registerTeam: (req, res) => {
    const { name, password, confirmPassword } = req.body;
    const errors = {};

    console.log('body', req.body, !inRange(name.length, 5, 32));

    if (!inRange(name.length, 5, 32))
      errors.name = 'Team name must be 5 to 32 characters.';
    if (password.length < 8)
      errors.password = 'Password must be at least 8 characters';
    else if (password !== confirmPassword)
      errors.password = 'Passwords do not match';

    if (Object.keys(errors).length) {
      console.log('errors', errors);
      return res.status(409).json({ errors: errors });
    }
    const query = 'SELECT id FROM teams WHERE name = ?';
    db.query(query, req.body.name, (err, users) => {
      if (err) return sendServerError(err, res);
      if (users.length > 0) errors.name = name + ' is already taken';
      if (Object.keys(errors).length == 0) createTeam(req.body);
      else res.status(409).json({ errors: errors });
    });

    function createTeam(user) {
      bcrypt.hash(user.password, ROUNDS, (err, hash) => {
        const query =
          'INSERT INTO teams (name, password, location) VALUES (?, ?, ?)';
        const userData = [user.name, hash, user.location];
        db.query(query, userData, (err, packet) => {
          if (err) return sendServerError(err, res);
          else {
            setSessionRole(req, 'teams', packet.insertId);
            res.json({ userId: packet.insertId });
          }
        });
      });
    }
  },

  login: (req, res, next, role = 'users') => {
    let query = 'SELECT * FROM ' + role + ' WHERE name = ?';
    db.query(query, req.body.name, (err, users) => {
      if (err) return sendServerError(err, res);
      if (users.length) validateUser(req, users[0]);
      else res.status(409).json({ error: 'Name or password invalid' });
    });

    function validateUser(req, user) {
      bcrypt.compare(req.body.password, user.password, (err, status) => {
        if (status) {
          setSessionRole(req, role, user.id);
          res.status(200).json({
            user: { id: user.id, name: user.name, location: user.location },
          });
        } else res.status(409).json({ error: 'Name or password invalid' });
      });
    }
  },

  isLoggedIn: (req, res) => {
    if (req.session.userId) {
      let table = req.session.admin ? 'users' : 'teams';
      let query = 'SELECT id, name, location FROM ' + table + ' WHERE id=?';

      let data = [req.session.userId];
      db.query(query, data, (err, data) => {
        if (err) res.status(500).json({ message: 'Server error' });
        else {
          let resData = {};
          table = table.slice(0, -1);
          resData[table] = data[0];
          res.status(200).json(resData);
        }
      });
    } else res.status(401).json({ message: 'You are not logged in' });
  },

  logout: (req, res) => {
    req.session.userId = null;
    req.session.admin = null;
    req.session.team = null;
    res.status(200).json({ message: "You've been logged out" });
  },

  locations: (req, res) => {
    let query = 'SELECT * FROM locations';
    db.query(query, (err, locations) => {
      if (err) return sendServerError(err, res);
      else res.json({ locations: locations });
    });
  },
};
