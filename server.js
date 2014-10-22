var http = require('http');
var tidy = require('htmltidy').tidy;
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var fs = require('fs');
var async = require('async');

var files = fs.readdirSync('_teams');

var teams = [];
for (var i = 0; i < files.length; i++) {
    teams.push(JSON.parse(fs.readFileSync('_teams/' + files[i])));
    console.log('file found: ' + files[i]);
}

var output = { "teams": [] };

var now = new Date();
var curr_date = now.getDate();
var curr_month = now.getMonth() + 1; //Months are zero based
var curr_year = now.getFullYear();
var fileName = curr_year + '-' + curr_month + '-' + curr_date;

var log = function(log) {
    var jsonDate = new Date().toJSON();
    log = '[' + jsonDate + '] ' + log + '\r\n';
    fs.appendFile('_log/' + fileName + '.txt', log, function (err) {
        if(err != null) {
            console.log('Could not write to log: ' + err);
        }
    });
};

var str;
function onDataChunckHandler() {
    return function(chunck) {
        str += chunck;
    };
}

function onTidyReadyHandler() {
    return function(err, html){

        console.log('tidied');
        var doc = new dom().parseFromString(html);
    
        var select;
    
        var pf = ct.prefix;
        select = xpath.useNamespaces({ pf: ct.uri });

        // Work in progress
        //var select = xpath.select()
        var title = select("/ns:html/ns:head/ns:title/text()", doc).toString();
        console.log('title: ' + title);
        log(title);
    };
}

function onResponseEndHandler() {
    return function() {
        console.log('response ended: ' + str.length + ' bytes');
        // I don't know why tidy has a problem with the &nbsp;
        // I keep getting the "entity not found:&nbsp;" message
        // during tidy except when I add the quoteNbsp option.
        var opts = {
            outputXml: true,
            hideComments: true, //  multi word options can use a hyphen or "camel case"
            indent: false,
            clean: true,
            doctype: 'omit',
            quoteNbsp: false
        };

        tidy(str, opts, onTidyReadyHandler());    
    };
}

function onDoingRequestHandler() {
    return function(res) {
        str = '';
        res.on('data', onDataChunckHandler());
        res.on('end', onResponseEndHandler());
    };
}

var asyncTasks = [];

for(var i = 0; i < teams.length; i++) {
    var ct = teams[i];
    var newTeam = {};
    newTeam.about = ct.about;
    newTeam.players = [];

    var options = {
        host: ct.dataUrl.host,
        path: ct.dataUrl.path
    };
    
    console.log(ct.dataUrl.host + ct.dataUrl.path);
    asyncTasks.push(
        http.request(options, onDoingRequestHandler()).end()
    );
};

async.series(
    asyncTasks,
    function(err, results) {
        console.log(asyncTasks.length + ' tasks done');
        // all done
        var outputPath = '_output/' + fileName + '.json';
        
        if(fs.existsSync(outputPath)) {
            console.log('it exists');
            fs.unlinkSync(outputPath);
            console.log('deleted');
        }
        
        console.log('writing');
        fs.writeFileSync(outputPath, JSON.stringify(output, undefined, 2));
        console.log('written');    
    }
);




