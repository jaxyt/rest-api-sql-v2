'use strict';

const express = require('express');
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const { Sequelize, sequelize, models } = require('./db');
const { User, Course } = models;

const router = express.Router();


const authenticate = async (req, res, next) => {
    let message = null;
    let user;
    const credentials = auth(req);
    if (credentials) {
        user = await User.findOne({ where: { emailAddress: credentials.name }});
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
        next()
    }
}

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessages });
    } else{
        next()
    }
}


// Returns the currently authenticated user
router.get('/users', authenticate, async (req, res, next) => {
    const credentials = auth(req);
    const user = await User.findOne({where: { emailAddress: credentials.name }, attributes: ['id','firstName','lastName','emailAddress']});
    res.json(user);
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
  ], validate, async (req, res, next) => {
        const existingUser = await User.findOne({where: {emailAddress: req.body.emailAddress}});
        if (existingUser) {
            res.status(400).json({error: "This email address is already in use"});
        } else {
            next();
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


router.get('/courses', authenticate, async (req, res) => {
    const courses = await Course.findAll({attributes: ['id','title','description','estimatedTime','materialsNeeded'], include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'emailAddress'] }]});
    res.json(courses);
});

router.get('/courses/:id', authenticate, async (req, res) => {
    const courses = await Course.findOne({where: { id: req.params.id }, attributes: ['id','title','description','estimatedTime','materialsNeeded'], include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'emailAddress'] }]});
    res.json(courses);
});

router.post('/courses',  [
    check('title')
      .exists()
      .withMessage('Please provide a value for "title"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "description"'),
  ], validate, authenticate, async (req, res, next) => {
    try {
        const credentials = auth(req);
        const currentUser = await User.findOne({where: {emailAddress: credentials.name}})
        const newCourse = await Course.create({title: req.body.title, description: req.body.description, estimatedTime: req.body.estimatedTime || null, materialsNeeded: req.body.materialsNeeded || null, userId: req.body.userId ? req.body.userId : currentUser.id});
        
        // Set the location to '/courses/id', the status to 201 Created, and end the response.
        return res.status(201).location(`/courses/${newCourse.id}`).end();
    } catch (error) {
        console.log(error);
        res.json({error: `${error}`})
    }
})

router.put('/courses/:id', [
    check('title')
      .exists()
      .withMessage('Please provide a value for "title"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "description"'),
  ], validate, authenticate, async (req, res, next) => {
        const credentials = auth(req);
        const user = await User.findOne({where: {emailAddress: credentials.name}});
        const course = await Course.findOne({where: {id: req.params.id}});
        if (user.id === course.userId) {
            next();
        } else {
            res.status(403).json({error: "The course you are attempting to modify is owned by a different user"})
        }
    }, async (req, res, next) => {
        const updates = req.body;
        const currentCourse = await Course.findOne({where: {id: req.params.id}});
        const updatedCourse = await Course.update({title: updates.title, description: updates.description, estimatedTime: updates.estimatedTime ? updates.estimatedTime : currentCourse.estimatedTime, materialsNeeded: updates.materialsNeeded ? updates.materialsNeeded : currentCourse.materialsNeeded, userId: updates.userId ? updates.userId : currentCourse.userId}, {where: {id: req.params.id}});
        return res.status(204).end();
});

router.delete('/courses/:id', authenticate, async (req, res, next) => {
    const credentials = auth(req);
    const user = await User.findOne({where: {emailAddress: credentials.name}});
    const course = await Course.findOne({where: {id: req.params.id}});
    if (user.id === course.userId) {
        next();
    } else {
        res.status(403).json({error: "The course you are attempting to modify is owned by a different user"})
    }
}, async (req, res, next) => {
    const deletedCourse = await Course.destroy({where: {id: req.params.id}});
    res.status(204).end();
})

module.exports = router;

// {"title":"Test Course 4","description":"Another dummy test course"}
// {"firstName":"Test","lastName":"User","emailAddress":"test@user.com","password":"password"}
