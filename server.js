var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser')
var request = require('request');
var app = express();

app.use(express.static(__dirname + '/static'))
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(session({secret: 'XASDASDA'}));

/**
 * Resolves client_id for API-CALL
 */
function getClientId() {
    if (process.env.VCAP_SERVICES) {
        // if app runs in swisscom appcloud use env variables of Smart Messaging service.
        var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
        console.log('VCAP_SERVICES:', vcapServices);
        return vcapServices.smartmsg[0].credentials.client_id;
    }
    else {
        // otherwise use static client_id.
        return "qHS5Y5wJPhX6HAjGZ5hMQTiiSPSLnpPK";
    }
}

/**
 * Sends an simple SMS
 */
app.post('/sendsms', function (req, res, next) {
    var client_id = getClientId();
    console.log('info:', 'Send message "' + req.body.text + '" to ' + req.body.to + ' under usage of client_id: ' + client_id + ' ');

    var options = {
        url: 'https://api.swisscom.com/messaging/sms',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'client_id': client_id,
            'SCS-Version': '2',
            'SCS-Request-ID': Math.random()
        },
        json: {
            "to": req.body.to,
            "text": req.body.text
        }
    };

    request(options, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        if (response.statusCode == 201) {
            res.redirect('/success.html');
        } else {
            res.redirect('/error.html');
        }
    });

})

/**
 * Sends a TOKEN for phone number validation.
 */
app.post('/sendtoken', function (req, res, next) {

    var client_id = getClientId();
    console.log('info:', 'Send token to ' + req.body.to + ' under usage of client_id: ' + client_id + ' ');

    req.session.to = req.body.to;

    var options = {
        url: 'https://api.swisscom.com/messaging/tokenvalidation',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'client_id': client_id,
            'SCS-Version': '2',
            'SCS-Request-ID': Math.random()
        },
        json: {
            "to": req.body.to,
            "text": "Verification code: %TOKEN% \r\n Expires in 60 seconds.",
            "tokenType": "SHORT_ALPHANUMERIC",
            "expireTime": 60,
            "tokenLength": 4
        }
    };

    request(options, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        if (response.statusCode == 201) {
            res.redirect('/validate.html');
        } else {
            res.redirect('/error.html');
        }
    });

})

/**
 * Validates the token of phone number validation
 */
app.post('/validate', function (req, res, next) {

    var client_id = getClientId();
    console.log('info:', 'Validate token "' + req.body.token + '" for number ' + req.session.to + ' under usage of client_id: ' + client_id + ' ');

    var options = {
        url: 'https://api.swisscom.com/messaging/tokenvalidation/' + req.session.to + '/' + req.body.token,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'client_id': client_id,
            'SCS-Version': '2',
            'SCS-Request-ID': Math.random()
        }
    };

    request(options, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        if (response.statusCode == 200) {
            var bd = JSON.parse(body);
            if (bd.validation == "SUCCESS") {
                res.redirect('/success.html');
            } else {
                res.redirect('/failed.html');
            }
        } else {
            res.redirect('/error.html');
        }
    });

})

app.listen(process.env.PORT || 3000, function () {
    console.log('Listening on http://localhost:' + (process.env.PORT || 3000))
})