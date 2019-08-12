'use strict';

const express = require('express');
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const { Sequelize, sequelize, models } = require('./db');
const { User, Course } = models;

const router = express.Router();

/**
 * This authenticates the user based on the credentials parsed from the request object
 * @param {Object} req 
 * @param {Object} res 
 * @param {Object} next 
 */
const authenticate = async (req, res, next) => {
    try {
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
    } catch (error) {
        next(err)
    }
}

/**
 * Makes sure that the minimum parameters are supplied in the request body
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const validate = (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            res.status(400).json({ errors: errorMessages });
        } else{
            next()
        }
    } catch (err) {
        next(err)
    }
}


// Returns the currently authenticated user
router.get('/users', authenticate, async (req, res, next) => {
    try {
        const credentials = auth(req);
        const user = await User.findOne({where: { emailAddress: credentials.name }, attributes: ['id','firstName','lastName','emailAddress']});
        res.json(user); 
    } catch (err) {
        next(err)
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
  ], validate, async (req, res, next) => {
      try {
        const existingUser = await User.findOne({where: {emailAddress: req.body.emailAddress}});
        if (existingUser) {
            res.status(400).json({error: "This email address is already in use"});
        } else {
            next();
        }
      } catch (err) {
          next(err);
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

/**
 * returns all courses in json format after authenticating the user
 */
router.get('/courses', authenticate, async (req, res, next) => {
    try {
        const courses = await Course.findAll({attributes: ['id','title','description','estimatedTime','materialsNeeded'], include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'emailAddress'] }]});
        res.json(courses);  
    } catch (err) {
        next(err);
    }

});

/**
 * returns a specific course after authentication is successful
 */
router.get('/courses/:id', authenticate, async (req, res, next) => {
    try {
        let message;
        const course = await Course.findOne({where: { id: req.params.id }, attributes: ['id','title','description','estimatedTime','materialsNeeded'], include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'emailAddress'] }]});
        if (course != null) {
            message = res.status(200).json(course);
        } else {
            message = res.status(404).json({error: "We were unable to find the course you requested"});
        }
        return message
    } catch (err) {
        next(err);
    }

});

/**
 * creates a new course and assigns it to either the current user or a user specified in the body
 */
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
        res.json({error: `${error}`});
    }
})


/**
 * updates a specific course after validating, authenticating, and comparing the user and the request
 */
router.put('/courses/:id', [
    check('title')
      .exists()
      .withMessage('Please provide a value for "title"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "description"'),
  ], validate, authenticate, async (req, res, next) => {
    try {
        const credentials = auth(req);
        const user = await User.findOne({where: {emailAddress: credentials.name}});
        const course = await Course.findOne({where: {id: req.params.id}});
        if (user.id === course.userId) {
            next();
        } else {
            res.status(403).json({error: "The course you are attempting to modify is owned by a different user"})
        }    
    } catch (err) {
        next(err)
    }

    }, async (req, res, next) => {
        try {
            const updates = req.body;
            const currentCourse = await Course.findOne({where: {id: req.params.id}});
            const updatedCourse = await Course.update({title: updates.title, description: updates.description, estimatedTime: updates.estimatedTime ? updates.estimatedTime : currentCourse.estimatedTime, materialsNeeded: updates.materialsNeeded ? updates.materialsNeeded : currentCourse.materialsNeeded, userId: updates.userId ? updates.userId : currentCourse.userId}, {where: {id: req.params.id}});
            return res.status(204).end();
        } catch (err) {
            next(err)
        }

});

/**
 * deletes a course after authenticating and comparing the user and the request
 */
router.delete('/courses/:id', authenticate, async (req, res, next) => {
    try {
        const credentials = auth(req);
        const user = await User.findOne({where: {emailAddress: credentials.name}});
        const course = await Course.findOne({where: {id: req.params.id}});
        if (user.id === course.userId) {
            next();
        } else {
            res.status(403).json({error: "The course you are attempting to modify is owned by a different user"})
        }    
    } catch (err) {
        next(err)
    }

}, async (req, res, next) => {
    try {
        const deletedCourse = await Course.destroy({where: {id: req.params.id}});
        res.status(204).end();  
    } catch (err) {
        next(err)
    }

})

module.exports = router;

// {"title":"Test Course 4","description":"Another dummy test course"}
// {"firstName":"Test","lastName":"User","emailAddress":"test@user.com","password":"password"}
