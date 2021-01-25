//Install express server
const express = require('express');
const path = require('path');
const app = express();
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGODB_URI || 'mongodb://localhost/test';


// Serve only the static files form the dist directory
app.use(express.static(__dirname + '/dist/app'));
app.use(bodyParser.json());

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname+'/dist/app/index.html'));
});

app.get('/api/leaderboard', function(req, res) {
    try {
        MongoClient.connect(url, {useUnifiedTopology: true,
            useNewUrlParser: true}, function(err, db) {
            if (err) throw err;
            var dbo = db.db("test");
            dbo.collection("scores").find({}).sort( { "score": -1 } ).toArray(function(err, result) {
                if (err) console.log(err)
                console.log(JSON.stringify(result));
                res.status(201).send(JSON.stringify(result));
                db.close();
            });
        });
    } catch (e) {
        return res.status(400).json({ error: error.toString() });
    }
});

app.post('/api/score', function(req, res){
    const score = req.body;
    try {
        MongoClient.connect(url, {useUnifiedTopology: true,
            useNewUrlParser: true}, function(err, db) {
            if (err) throw err;
            const dbo = db.db("test");
            dbo.collection("scores").insertOne(score, function(err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        })
    } catch (e) {
        return res.status(400).json({ error: error.toString() });
    }
    return res.status(200);
});

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || 8080, function () {
    console.log('Fly Valentine Fly back-end is running on port 8080');
});

/* Uncaught error handling */
app.use((err, req, res, next) => {
    console.log('Caught unhandled error: ' + err.stack);
    res.status(500).send('Internal Server Error 500');
});

process.on('unhandledRejection', (err) => {
    console.log(err.stack);
});
