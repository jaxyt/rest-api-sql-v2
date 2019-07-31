'use strict';

const express = require('express');
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const { Sequelize, sequelize, models } = require('./db');
const { User, Course } = models;

const router = express.Router();



// Returns the currently authenticated user
router.get('/users', async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name }, attributes: [ 'id', 'firstName', 'lastName', 'emailAddress' ] });
        if (user) {
            const authenticated = await bcryptjs.compare(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for username: ${user.firstName + " " + user.lastName}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for user: ${user.emailAddress}`;
            }
        } else {
            message = `User not found for username: ${user.emailAddress}`;
        }
    } else {
        message = 'Auth header not found';
    }
    if (message) {
        console.warn(message);
        res.status(401).json({ message: 'Access Denied' });
    } else {
        res.json(user);
    }
    
});

// Route that creates a new user.
router.post('/users', [
    check('firstName')
      .exists()
      .withMessage('Please provide a value for "firstName"'),
    check('lastName')
        .exists()
        .withMessage('Please provide a value for "lastName"'),
    check('emailAddress')
      .exists()
      .withMessage('Please provide a value for "emailAddress"'),
    check('password')
      .exists()
      .withMessage('Please provide a value for "password"'),
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessages });
    }

    // Get the user from the request body.
    const user = req.body;
    const hashed = bcryptjs.hashSync(req.body.password, 10);
    User.create({firstName: user.firstName, lastName: user.lastName, emailAddress: user.emailAddress, password: hashed}).then(newUser => {
        // Set the location to '/', the status to 201 Created, and end the response.
        res.location('/');
        res.status(201).end();
    });
});

router.get('/courses', async (req, res) => {
    const courses = await Course.findAll({ 
        attributes: [ 
            'id', 'title', 'description', 'estimatedTime', 'materialsNeeded'
        ],
        include: [{
            model:User, attributes:['firstName', 'lastName', 'emailAddress']
        }]
    });
    res.json(courses);
});

router.get('/courses/:id', async (req, res) => {
    const course = await Course.findOne({
        where: {id: req.params.id}, 
        attributes: [ 
            'id', 'title', 'description', 'estimatedTime', 'materialsNeeded'
        ],
        include: [{
            model:User, attributes:['firstName', 'lastName', 'emailAddress']
        }]
    });
    res.json(course);
});

module.exports = router;