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
  ], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessages });
    } else{
        next()
    }
  }, async (req, res) => {
    try {
        const hashed = await  bcryptjs.hash(req.body.password, 10); 
        const newUser = await User.create({firstName: req.body.firstName, lastName: req.body.lastName, emailAddress: req.body.emailAddress, password: hashed});
        
        // Set the location to '/', the status to 201 Created, and end the response.
        return res.status(201).location(`/`).end();
    } catch (error) {
        console.log(error);
        res.json({error: `${error}`})
    }
    
});


router.get('/courses', async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name } });
        if (user) {
            const authenticated = await bcryptjs.compare(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for user: ${user.firstName + " " + user.lastName}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
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
        next()
    }
}, async (req, res) => {
    const courses = await Course.findAll({attributes: ['id','title','description','estimatedTime','materialsNeeded'], include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'emailAddress'] }]});
    res.json(courses);
});

router.get('/courses/:id', async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name } });
        if (user) {
            const authenticated = await bcryptjs.compare(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for user: ${user.firstName + " " + user.lastName}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
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
        next()
    }
}, async (req, res) => {
    const courses = await Course.findOne({where: { id: req.params.id }, attributes: ['id','title','description','estimatedTime','materialsNeeded'], include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'emailAddress'] }]});
    res.json(courses);
});

router.post('/courses',  [
    check('title')
      .exists()
      .withMessage('Please provide a value for "firstName"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "lastName"'),
  ], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessages });
    } else{
        next()
    }
  }, async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name } });
        if (user) {
            const authenticated = await bcryptjs.compare(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for user: ${user.firstName + " " + user.lastName}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
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
        next()
    }
}, async (req, res, next) => {
    try {
        const credentials = auth(req);
        const currentUser = await User.findOne({where: {emailAddress: credentials.name}})
        const newCourse = await Course.create({title: req.body.title, description: req.body.description, estimatedTime: req.body.estimatedTime || null, materialsNeeded: req.body.materialsNeeded || null, userId: currentUser.id});
        
        // Set the location to '/courses/id', the status to 201 Created, and end the response.
        return res.status(201).location(`/courses/${newCourse.id}`).end();
    } catch (error) {
        console.log(error);
        res.json({error: `${error}`})
    }
})

router.put('/courses/:id',  [
    check('title')
      .exists()
      .withMessage('Please provide a value for "firstName"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "lastName"'),
  ], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessages });
    } else{
        next()
    }
  }, async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name } });
        if (user) {
            const authenticated = await bcryptjs.compare(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for user: ${user.firstName + " " + user.lastName}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
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
        next()
    }
}, async (req, res, next) => {
    
})

router.delete('/courses/:id',  [
    check('title')
      .exists()
      .withMessage('Please provide a value for "firstName"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "lastName"'),
  ], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessages });
    } else{
        next()
    }
  }, async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name } });
        if (user) {
            const authenticated = await bcryptjs.compare(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for user: ${user.firstName + " " + user.lastName}`);
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
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
        next()
    }
}, async (req, res, next) => {

})

module.exports = router;

// {"title":"Test Course 4","description":"Another dummy test course"}
// {"firstName":"Test","lastName":"User","emailAddress":"test@user.com","password":"password"}
