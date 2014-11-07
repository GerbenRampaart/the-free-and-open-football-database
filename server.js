/*var http = require('http');
var tidy = require('htmltidy').tidy;
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;*/
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

var chunks = [];
function onDataChunkHandler() {
    return function(chunk) {
        chunks.push(chunk);
    };
}

function onTidyReadyHandler(team) {
    return function(err, html){
        console.info('tidied');
        //html = html.replace(' xmlns=', '');
        //html = html.replace('"http://www.w3.org/1999/xhtml"', '');
        log(html);
        var doc = new dom().parseFromString(html);
        var nsObj = JSON.parse('{ "' + team.namespace.prefix + '": "' + team.namespace.uri +'" }');
        var select = xpath.useNamespaces(nsObj);

        for(var i = 0; i < team.currentSquadRows.length; i++) {
            var cur = team.currentSquadRows[i];
            var nodeList = select(cur.xpath, doc);
            console.log(nodeList.length + ' nodes found');
            console.log(nodeList);
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
        var result = chunks.join(' ');
        console.log('response ended: ' + result.length + ' bytes');
        //str = str.replace(/\r?\&nbsp;\r/g, ' ');
        //result = result.replace(/\r?\n|\r/g, ' ');

        console.log('replaced all line breaks with spaces. size is now: ' + result.length);

        // I don't know why tidy has a problem with the &nbsp;
        // I keep getting the "entity not found:&nbsp;" message
        // during tidy except when I add the quoteNbsp option.
        var opts = {
            outputXml: true,
            hideComments: true, //  multi word options can use a hyphen or "camel case"
            indent: false,
            clean: true,
            doctype: 'omit',
            quoteNbsp: false,
            literalAttributes: true
        };

        tidy(result, opts, onTidyReadyHandler(team));
    };
}


function onDoingRequestHandler(team) {
    return function(res) {
        chunks = [];
        res.on('data', onDataChunkHandler());
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

    var YQL = require('yql');
    var query = new YQL("select * from html where url='" +
        team.dataUrl.host + team.dataUrl.path + "'");
    // + " and xpath='" + team.currentSquadRows[0].xpath + "'"
    console.log(query);

    var select = require('js-select');

    query.exec(function (error, result) {
        console.log(error);
log(JSON.stringify(result), undefined, 2);
        console.log(result);
        for(var i = 0; i < team.currentSquadRows[0].columns.length; i++) {
            var node = select(result, '.td').nodes()[i];
            var val = select(node, '.content').nodes()[i];
            log(JSON.stringify(val));
        }
    });

    /*
    select(query).forEach(function(node){
       if(this.matches)
    });


     */

    asyncTasks.push(



        //http.request(options, onDoingRequestHandler(team)).end()
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

