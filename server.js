var http = require('http');
var tidy = require('htmltidy').tidy;
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var fs = require('fs');

var config = JSON.parse(fs.readFileSync('config.json'));
var output = { "teams": [] };

var now = new Date();
var curr_date = now.getDate();
var curr_month = now.getMonth() + 1; //Months are zero based
var curr_year = now.getFullYear();
var fileName = curr_year + '-' + curr_month + '-' + curr_date;

for(var i = 0; i < config.teams.length; i++) {
    var ct = config.teams[i];
    var newTeam = {};
    newTeam.about = ct.about;
    newTeam.players = [];

    var options = {
        host: ct.dataUrl.host,
        path: ct.dataUrl.path
    };

    var str;
    http.request(options, function(res) {

        res.on('data', function(chunck){
            str += chunck;
        });

        res.on('end', function(){

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
            tidy(str, opts, function(err, html){
                var doc = new dom().parseFromString(html);

                var select;

                if(ct.useNamespace) {
                    var pf = ct.prefix;
                    select = xpath.useNamespaces({ pf: ct.uri });
                }

                // Work in progress
                //var select = xpath.select()
                var title = select("/ns:html/ns:head/ns:title/text()", doc).toString();
                console.log('title: ' + title);
                log(title);
            });
        });

    }).end();
};

fs.writeFileSync('_output/' + fileName + '.json', JSON.stringify(output, undefined, 2));

var log = function(log) {
    var jsonDate = new Date().toJSON();
    log = '[' + jsonDate + '] ' + log + '\r\n';
    fs.appendFile('_log/' + fileName + '.txt', log, function (err) {
        if(err != null) {
            console.log('Could not write to log: ' + err);
        }
    });
};
