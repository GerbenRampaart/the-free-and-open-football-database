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
    console.info('file found: ' + files[i]);
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
            console.info('Could not write to log: ' + err);
        }
    });
};

var str;
function onDataChunckHandler() {
    return function(chunck) {
        str += chunck;
    };
}

function onTidyReadyHandler(team) {
    return function(err, html){


        html = html.replace(' xmlns="http://www.w3.org/1999/xhtml"', '');

        console.log(html);

        console.info('tidied');
        var doc = new dom().parseFromString(html);
        var nsObj = JSON.parse('{ "' + team.namespace.prefix + '": "' + team.namespace.uri +'" }');
        var select = xpath.useNamespaces(nsObj);

        for(var i = 0; i < team.currentSquadRows.length; i++) {
            var cur = team.currentSquadRows[i];

            var nodeList = select(cur.xpath, doc);
            console.log(nodeList.length + ' nodes found');
            var cols = cur.columns;

            for(var j = 0; j < nodeList.length; j++) {
                var curNode = nodeList[j];

                for(var k = 0; k < columns.length; k++) {
                    var col = columns[k];
                    console.log(curNode.select(col.xpath).toString());
                }

            }

        }
    };
}

function onResponseEndHandler(team) {
    return function() {
        console.info('response ended: ' + str.length + ' bytes');

        var rawHtml = str.slice(0);
        rawHtml = rawHtml.replace(/\r?\n|\r/g, ' ');
        console.log('replaced all line breaks with spaces. size is now: ' + rawHtml.length);

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

        tidy(rawHtml, opts, onTidyReadyHandler(team));
    };
}

function onDoingRequestHandler(team) {
    return function(res) {
        str = '';
        res.on('data', onDataChunckHandler());
        res.on('end', onResponseEndHandler(team));
    };
}

var asyncTasks = [];

for(var i = 0; i < teams.length; i++) {
    var team = teams[i];
    var newTeam = {};
    newTeam.about = team.about;
    newTeam.players = [];

    var options = {
        host: team.dataUrl.host,
        path: team.dataUrl.path
    };
    
    console.info(team.dataUrl.host + team.dataUrl.path);
    asyncTasks.push(
        http.request(options, onDoingRequestHandler(team)).end()
    );
};

async.series(
    asyncTasks,
    function(err, results) {
        console.info(asyncTasks.length + ' tasks done');
        // all done
        var outputPath = '_output/' + fileName + '.json';
        
        if(fs.existsSync(outputPath)) {
            console.info('it exists');
            fs.unlinkSync(outputPath);
            console.info('deleted');
        }
        
        console.info('writing');
        fs.writeFileSync(outputPath, JSON.stringify(output, undefined, 2));
        console.info('written');    
    }
);




