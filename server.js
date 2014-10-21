var http = require('http');
var tidy = require('htmltidy').tidy;
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

var options = {
    host: "en.wikipedia.org",
    path: "/wiki/Netherlands_national_football_team"
};

var str;
http.request(options, function(res) {

    res.on('data', function(chunck){
       str += chunck;
    });

    res.on('end', function(){

        // I don't know why tidy has a problem with the &nbsp;
        // I keep getting the "entity not found:&nbsp;" message
        // during tidy.
        str = str.replace('&nbsp;', '&#160;');
//console.log(str);
        var opts = {
            outputXml: true,
            hideComments: true, //  multi word options can use a hyphen or "camel case"
            indent: false,
            clean: true,
            doctype: 'omit',
            ouputEncoding: 'utf8'
        }

        tidy(str, opts, function(err, html){

            console.log(html);

            var doc = new dom().parseFromString(html);
            var title = xpath.select("//title/text()", doc).toString();
            console.log(title);

        });
    });

}).end();
