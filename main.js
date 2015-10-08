var express = require("express");
var jade = require("jade");
var bodyParser = require("body-parser");
var app = express();


app.set("views", __dirname + "/views");
app.set("view engine","jade");
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({limit: (5*1024*1000) }));


var fs = require('fs');



var oTables = {
    "mapping_table":{
        "path": "tables/Mapping_Table.csv",
        "data":{}
    },
    "lookup_table":{
        "path": "tables/Lookup_Table.csv",
        "data":{}
    }

};





//console.log(aTables)

function doNext(index, aTables, callback){
    if(index < aTables.length - 1){
        readTable(index + 1, aTables, callback)
    } else {
        callback()
    }
}




function readTable(index, aTables, callback){ //read a csv table and return array of objects for each row

    inputFile = oTables[aTables[index]].path;

    fs.readFile(inputFile, 'utf-8',function (err, data) {
        if (err) throw err;
        obj = [];
        var lines = data.trim().split('\n');
        //console.log(lines)
        var fields = lines[0].trim().split(',');
        //console.log(fields)
        max_fields = fields.length;
        //console.log(max_fields)
        var max_lines = lines.length;
        //console.log(max_lines)

        //for(i = 1; i < 3; i++){
        for(i = 1; i < max_lines; i++){
            oRecord = {};
            aLine = lines[i].trim().split(',');
            //console.log(aLine)
            for(j = 0; j < max_fields; j++){
                oRecord[fields[j]] = aLine[j]
            }
            obj.push(oRecord)
        }

        oTables[aTables[index]].data = obj;
        doNext(index, aTables, callback)
    });
}





function getArrayOfTables(oTables){ //get array of table names to synch process them
    var aTables =[];
    for(table_name in oTables){
        aTables.push(table_name)
    }
    return aTables

}

var aTables = getArrayOfTables(oTables);


function convertDate(inputFormat) {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    var d = new Date(inputFormat);
    return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/');
}


function mapJson(oJson){

    var aInput = oJson.record_set; //get array of input records
    var aOutput = []; // create array of output records

    readTable(0, aTables, function(err){ //read the mapping and look up tables

        var aMapping = oTables.mapping_table.data;
        var aLookups = oTables.lookup_table.data;

        for(var input_i in aInput ){ //go through each input record

            var input_record = aInput[input_i];

            obj = {}; //create the output object for the record

            for (var i in aMapping) { //loop through the required fields from the mapping table

                oField = aMapping[i]; //get the field object
                source = oField.Source; //get the source type (eg map, lookup)
                // console.log(source)

                //get the field object values
                var target_field = oField.Target_Field;
                var target_val = "";
                var source_field = oField.Source_Field;
                var source_val = input_record[oField.Source_Field];
                var prefix = oField.Prefix;

                //console.log(target_field);

                if(source == "blank"){
                    target_val = "";
                }
                if(source == "constant"){
                    target_val = prefix;
                }
                if(source == "map"){
                    target_val = source_val;
                }
                if(source == "concatenate"){
                    target_val = prefix + source_val;
                }
                if(source == "lookup") {

                    for (var lookup_index in aLookups) { //loop through the lookup table and find the matching recods
                        oLookupRow = aLookups[lookup_index];
                        if (oLookupRow.target_field == target_field &&
                            oLookupRow.source_field == source_field &&
                            oLookupRow.source_value == source_val) {
                            target_val = oLookupRow.target_value;
                            //break; //need to check duplicate mappings ???
                            //need to check missing lookup??
                        }
                    }
                }
                if(source == "function"){
                    if(target_field == "ExtractDate"){
                        var today = new Date;
                        target_val = convertDate(today);
                    }
                }

                obj[oField.Target_Field] = target_val;


            }
            //console.log(obj)

            aOutput.push(obj)



        }

        //write values to csv file
        var output_string = "";
        var line = "";
        var mapping_index;
        var output_index;

        //write the headers
        line = "";
        for(mapping_index in aMapping){
            if(line.length > 0){line +=  ','}
           // line += '"' + String(aMapping[mapping_index].Target_Field) + '"';
            line += String(aMapping[mapping_index].Target_Field).trim();
        }
        line += "\n";

        output_string += line;


        //write records
        for(output_index in aOutput){
            line = "";
            for(mapping_index in aMapping){
                if(line.length > 0){line +=  ','}
               // line += '"' + aOutput[output_index][aMapping[mapping_index].Target_Field]  + '"';
                line += String(aOutput[output_index][aMapping[mapping_index].Target_Field]).trim();
            }
            line += "\n";
            output_string += line;
        }

        var outputCsvName = "output.csv";
        fs.writeFile(outputCsvName,output_string, function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log("Output csv saved")
            }
        });
    });



}



function getJson(){ //gets the json from a csv instead of post

    oJson = {};
    oJson.record_set = [];


    //console.log(__dirname & "/inputdata.csv")
    //var parse = require('csv-parse');

    fs.readFile('inputdata.csv', 'utf-8',function (err, data) {
        if (err) throw err;
        var lines = data.trim().split('\n');
        var fields = lines[0].trim().split(',');
        //console.log(fields)
        max_fields = fields.length;
        //console.log(max_fields)

        var max_lines = lines.length;
        //console.log(max_lines)

        //for(i = 1; i < 3; i++){
        for(i = 1; i < max_lines; i++){
            oRecord = {};
            aLine = lines[i].trim().split(',');
            //console.log(aLine)

            for(j = 0; j < max_fields; j++){
                oRecord[fields[j]] = aLine[j]
            }
            oJson.record_set.push(oRecord)

        }
        //console.log(oJson)
        //console.log(data.length);

        mapJson(oJson) //once you have the planning data json call the map function
    });

};

//getJson() //test mapping



//***********************************************************************

console.log("JERE")

app.post('/', function(request, response){

    var outputFilename = 'data.json';
    fs.writeFile(outputFilename, JSON.stringify(request.body, null, 4), function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + outputFilename);
        }
    });

    console.log(request.body);      // your JSON

    response.send(request.body);    // echo the result back

});

app.listen(3005);