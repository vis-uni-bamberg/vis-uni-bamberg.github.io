window.durationOfYears = 3; //minimum 1 year
seedAText = "Seed A | #Citations: ";
seedBText = "Seed B | #Citations: ";
seedABText = "# Common Citations: ";
window.otherIntentName = "other";

window.examplePapers = 
    [
        {
        "text": "Sample Papers",
        "children": 
            [
                {
                    "id": "7b2972e2bdd6944338a895c97eecbd12725fdcd8",
                    "text": "Narrative Visualization: Telling Stories with Data"
                },
                {
                    "id": "0404e645cf47f1062de29a02c4791fe5906211db",
                    "text": "Coupling Story to Visualization: Using Textual Analysis as a Bridge Between Data and Interpretation"
                },
                {
                    "id": "92f36007d016049f7bf3e47a804e3a99093bcada",
                    "text": "UpSet: Visualization of Intersecting Sets"
                }
            ]
        }
    ];

window.seedJSON = {"A": {}, "B": {}};



function selectPaper(paperId, paperTitle, group)
{
    if(paperId !=null)
    {
        d3.select("body").style("cursor","wait");
        var url = "https://api.semanticscholar.org/v1/paper/"+paperId;
        $.ajax({
            url: url,
            data: null,
            success: function(respData){
                // console.log(respData);
                if(respData!= null)
                {
                    window.seedJSON[group] = respData;
                    
                    var paperDetails = "";
                    var authors = getAuthors(respData["authors"]);
                    doiHref = "";
                    
                    paperDetails += `${authors} "<i>${respData["title"]}.</i>"  ${respData["venue"]} <b>${respData["year"]}</b>. ` + "";
                    if(respData["doi"])
                    {
                        doiHref = `<a href=https://doi.org/${respData["doi"]}}>DOI</a>  `;
                        paperDetails += doiHref
                    }
                    selectionPanel.initGroupSelection(group, paperDetails);
                    convertS2toSetData(window.seedJSON["A"], window.seedJSON["B"]);
                    
                }
                d3.select("body").style("cursor","default");

            },
            dataType: "json"
          });

        
    }
    else{
        alert("No paper selected!")
    }
}

function getAuthors(authorsArray)
{
    var authors = "";
    if(authorsArray.length ==1)
    {
        authors = authorsArray[0]["name"];
    }
    else if(authorsArray.length ==2)
    {
        authors = authorsArray[0]["name"] + " and " + authorsArray[1]["name"];
    }
    else
        authors = authorsArray[0]["name"] + " <i>et al.<i>";
    
    return authors;
}

window.onload = function () {
    
    datasetSelection.init();
    selectionPanel.init();

    $("#s2paperIdbuttonA").on("click", function(){
        
        var title = $('#s2paperId option:selected').text();
        var id = $('#s2paperId').val();
        selectPaper(id, title, "A");
        console.log("button A clicked", title, id);
    });

    $("#s2paperIdbuttonB").on("click", function(){
        
        var title = $('#s2paperId option:selected').text();
        var id = $('#s2paperId').val();
        selectPaper(id, title, "B");
        console.log("button B clicked", title, id);
    });

    let tempdefaultdata = window.examplePapers[0]["children"];
    d3.select("#s2paperId").append("option");
    for(var x=0; x< tempdefaultdata.length; x++)
    {
        d3.select("#s2paperId").append("option").attr({
            "value": tempdefaultdata[x]["id"]
        }).text(tempdefaultdata[x]["text"]);

    }

    var $select2 = $('#s2paperId');

    // $select2.select2({
    //     data: window.examplePapers
    // });

    // Get options with "value" attributes that are not selected by default
    var $defaultResults = $('option[value]:not([selected])', $select2);
    var defaultResults = [];
    $defaultResults.each(function () {
       var $option = $(this);
       defaultResults.push({
          id: $option.attr('value'),
          text: $option.text()
       });
    });

    $select2.select2({
        placeholder: 'Search (Semantic Scholar) by paper title',
        ajax: {
          url: "https://api.semanticscholar.org/graph/v1/paper/search",
          dataType: 'json',
          delay: 1000,
          data: function (params) {
            return {
              query: params.term, // search term
            //   offset: 100,
            //   limit: 20
            };
          },
          processResults: function (data, params) {
            // parse the results into the format expected by Select2
            // since we are using custom formatting functions we do not need to
            // alter the remote JSON data, except to indicate that infinite
            // scrolling can be used
            // console.log(data, params);
            if("results" in data)
            {
                data = {"results": window.examplePapers};
                return data;
            }
            else if(data != undefined && data["data"] !=undefined)
            {
                
                params.page = params.page || 1;

                var modifiedData = [];
                for(var i=0; i< data["data"].length; i++)
                {

                    if("paperId" in data["data"][i] && "title" in data["data"][i])
                    {
                        var temp = {"id": data["data"][i]["paperId"], "text": data["data"][i]["title"]};
                        modifiedData.push(temp);
                    }
                }
                // console.log(modifiedData);
                var newData =JSON.parse(JSON.stringify(window.examplePapers));
                newData.push({"text": "Search Results", "children": modifiedData});

                return {
                results: newData,
                //   pagination: {
                //     more: (params.page * 30) < data.total_count
                //   }
                };
            }
          },
          cache: true
        },
        minimumInputLength: 1,
        templateResult: formatRepo,
        templateSelection: formatRepoSelection,
        // data: window.examplePapers,
        dataAdapter: $.fn.select2.amd.require('select2/data/extended-ajax'),
        defaultResults: defaultResults
        
    });
    

    function formatRepo (repo) {
        if (repo.loading) {
          return repo.text;
        }
      
        var $container = $(
          "<div class='select2-result-repository clearfix select2-results__option--selectable'>" +
              `<div class='select2-result-repository__title'>${repo.text}</div>` +
          "</div>"
        );
        return $container;
      }
      
      function formatRepoSelection (repo) {
        return repo.text;
      }

      
      

    
};

function makeSetForEmptyIntent(s2json)
{
    if(s2json["citations"])
    {
        for(var i=0; i<s2json['citations'].length; i++)
        {
            var intents = s2json['citations'][i]['intent'];
            if(intents.length == 0)
                s2json['citations'][i]['intent'] = [otherIntentName];
        }
    }
    return s2json;
    
}


function convertS2toSetData(s2json1, s2json2)
{
    // console.log(s2json);
    window.dataAFlag = false, window.dataBFlag = false;
    window.selectedPapers = {"A": {},
                        "B": {}
                    };
    window.objectData = {};
    window.yearlyCitations = {};
    window.minYear = -1, window.maxYear = 9999;
    objectTovisualize = {};

    window.lattices = {
        "Both": {},
        "A": {},
        "B": {}
    }

    s2json1 = makeSetForEmptyIntent(s2json1);
    s2json2 = makeSetForEmptyIntent(s2json2);


    if(Object.keys(s2json1).length>0)
    {
        window.dataAFlag = true;
        window.selectedPapers["A"] = {
                        "paperId": s2json1["paperId"],
                        "title": s2json1["title"],
                        "abstract": s2json1["abstract"],
                        "numCitations": s2json1["numCitedBy"],
                        "year": s2json1["year"]
                    }
        setData1 = getallSets(s2json1, "A");
        timebindata(setData1, window.durationOfYears);
        dataObject1 = convertDataToObjectString(s2json1, setData1);
        formattedData = DynaSet().getDataLattice(dataObject1, false);
        window.lattices["A"] = formattedData;
        if(Object.keys(s2json1).length>0 && Object.keys(s2json2).length==0)
            objectTovisualize = dataObject1;
    }
    if(Object.keys(s2json2).length>0)
    {
        window.dataBFlag = true;
        window.selectedPapers["B"] = {
            "paperId": s2json2["paperId"],
            "title": s2json2["title"],
            "abstract": s2json2["abstract"],
            "numCitations": s2json2["numCitedBy"],
            "year": s2json2["year"]
        }
        setData2 = getallSets(s2json2, "B");
        timebindata(setData2, window.durationOfYears);
        dataObject2 = convertDataToObjectString(s2json2, setData2);
        formattedData = DynaSet().getDataLattice(dataObject2, false);
        window.lattices["B"] = formattedData;

        if(Object.keys(s2json1).length == 0 && Object.keys(s2json2).length>0)
            objectTovisualize = dataObject2;

    }
    if(Object.keys(s2json1).length>0 && Object.keys(s2json2).length>0)
    {
        window.dataAFlag = true;
        window.dataBFlag = true;
        s2jsonMerged = mergeSetData(s2json1, s2json2);
        setDataBoth = getallSets(s2jsonMerged, "AB");
        timebindata(setDataBoth, window.durationOfYears);
        window.mergedDataObject = convertDataToObjectString(s2jsonMerged, setDataBoth);
        formattedData = DynaSet().getDataLattice(window.mergedDataObject, true);
        window.lattices["Both"] = formattedData;

        objectTovisualize = window.mergedDataObject;
        
    }


    
    visObject = DynaSet().loadHarcodedDatasetFromJavascriptObject(objectTovisualize);


    // return dataObject;
    // console.log(setData);
}
function mergeSetData(s2json1, s2json2)
{
    var copys2json1 = JSON.parse(JSON.stringify(s2json1))

    copys2json1["citations"] =    copys2json1["citations"].concat(s2json2["citations"]);
    return copys2json1;
}


function getallSets(s2json, grouptype)
{
    var sets={};


    for(var i=0; i<s2json['citations'].length; i++)
    {
        var citation = s2json['citations'][i];
        var intents = s2json['citations'][i]['intent'];
        if(intents.length>0 && grouptype != "AB")
        {
            if(intents.length == 0)
                s2json['citations'][i]['intent'] = [otherIntentName];

            if(!(citation["paperId"] in window.objectData))
            {    if(grouptype == "A")
                    window.objectData[citation["paperId"]] = {"year": citation["year"], "title": citation["title"], "intent": { "A" : citation["intent"]} };
                else if(grouptype=="B")
                    window.objectData[citation["paperId"]] = {"year": citation["year"], "title": citation["title"], "intent": { "B" : citation["intent"]} };
            }
            else
            {
                if(grouptype == "A")
                    window.objectData[citation["paperId"]]["intent"]["A"] = citation["intent"];
                else if(grouptype == "B")
                    window.objectData[citation["paperId"]]["intent"]["B"] = citation["intent"];
            }

            var citationyear = citation["year"];
            var citingPaperId = citation["paperId"];
            if(citationyear != null)
            {
                if(!(citationyear in window.yearlyCitations))
                {
                    if(grouptype == "A")
                        window.yearlyCitations[citationyear] = {"A": {"count": 1, "citingArticles": [citingPaperId]},
                                                                "B": {"count": 0, "citingArticles": []},
                                                                "AB": {"count": 0, "citingArticles": []}
                                                            };
                    else if(grouptype == "B")
                        window.yearlyCitations[citationyear] = { "A": {"count": 0, "citingArticles": []},
                                                                "B": {"count": 1, "citingArticles": [citingPaperId]},
                                                                "AB": {"count": 0, "citingArticles": []}
                                                            };
                }
                else
                {
                    if(grouptype == "A")
                    {
                        window.yearlyCitations[citationyear]["A"]["count"] +=1;
                        window.yearlyCitations[citationyear]["A"]["citingArticles"].push(citingPaperId);
                    }
                    else if(grouptype == "B")
                    {
                        window.yearlyCitations[citationyear]["B"]["count"] +=1;
                        window.yearlyCitations[citationyear]["B"]["citingArticles"].push(citingPaperId);
                    }
                }
            }
        }
        for(var j=0; j<intents.length; j++)
        {
            if(!(intents[j] in sets))
            {
                sets[intents[j]] = {'totalCount': 1,  'yearsObj': { }};
                sets[intents[j]]["yearsObj"][citation["year"]] =  {'count': 1, 'ids': [citation["paperId"]] };
            }
            else 
            {
                sets[intents[j]]['totalCount'] += 1;
                if (!(citation['year'] in sets[intents[j]]['yearsObj']))
                {
                    sets[intents[j]]["yearsObj"][citation["year"]] =  {'count': 1, 'ids': [citation["paperId"]] };
                }
                else
                {
                    sets[intents[j]]["yearsObj"][citation["year"]]['count'] += 1; 
                    sets[intents[j]]["yearsObj"][citation["year"]]['ids'].push(citation["paperId"]);
                    
                }
            }
        }
    }
    // console.log("set data: ", sets);
    return sets;
}

function timebindata(setData, duration)
{
    var stringKeys = [];

    for (const [set, value] of Object.entries(setData)) 
    {
        stringKeys = stringKeys.concat(Object.keys(value["yearsObj"]));
    }
    var intKeys = [];
    for(var i=0; i<stringKeys.length; i++)
    {
        if(stringKeys[i] != "null")
            intKeys.push(parseInt(stringKeys[i]));
    }
    intKeys.sort(function(a, b) {
        return a - b;
      });
    // console.log(intKeys);
    
    if(intKeys.length >0){
        if(window.minYear ==-1) window.minYear = intKeys[0];
        if(window.maxYear == 9999) window.maxYear = intKeys[intKeys.length -1];
    }

    // Binning the years for each set|citation intent
    
    for (const [set, value] of Object.entries(setData)) 
    {
        setData[set]["binned"] = {};
        for (var i=minYear; i<=(maxYear); i = i+duration)
        {
            count = 0;
            ids = [];
            for(var j=i; j<(i + duration); j++)
            {
                if(j in setData[set]["yearsObj"])
                {
                    count += setData[set]["yearsObj"][j]["count"];
                    ids = ids.concat(setData[set]["yearsObj"][j]["ids"]);
                }
            }
            var label = i + " - " + (i+duration -1);
            window.endYear = (i+duration -1);
            setData[set]["binned"][label] = {"count": count, "ids": ids};
        }
    }
    
}

function convertDataToObjectString(s2json, setData)
{
    var data = {};
    data["name"] = s2json['paperId'];
    data["description"] = s2json['title'];
    data['data'] = [];
    yearBinData = {};

    for (const [setname, value] of Object.entries(setData)) 
    {
        for (const [yearbin, details] of Object.entries(value["binned"])) 
        {
            if(!(yearbin in yearBinData))
            {
                yearBinData[yearbin] = {};
            }
            yearBinData[yearbin][setname] = details;
        }
    }
    // console.log(yearBinData);
    for (const [yearbin, value] of Object.entries(yearBinData)) 
    {
        var dataString = "";
        var dictOfCitingIds = {};
        for(const [setname, details] of Object.entries(value))
        {
            for(var k=0; k<details["ids"].length; k++)
            {
                var t_id = details["ids"][k];
                if(!(t_id in dictOfCitingIds))
                dictOfCitingIds[t_id] = 1;
            }
        }
        idArray = Object.keys(dictOfCitingIds);
        // first string header line
        var stringData = ""
        for (let item of idArray) stringData += ","+item;

        stringData += ",&&&";
        for(const [setname, details] of Object.entries(value))
        {
            stringData += setname;
            for(let iditem of idArray)
            {
                if(details["ids"].indexOf(iditem) >-1)
                    stringData += ",1";
                else
                    stringData += ",0";
            }
            stringData += ",&&&";
        }
        // stringData += "&&&";
        var obj = {};
        obj[yearbin] = stringData;
        data['data'].push(obj);

    }
    // console.log(data);
    return data;

}

const datasetSelection = function () {

    return {

        // TODO: replace index by id
        currentLoadedDatasetIndex: 0,
        currentId: "",

        init: function () {
            currentLoadedDatasetIndex = 0;
            this.currentId = Object.keys(window.datasets)[0];
            window.currentDatasetId = this.currentId;
            const datasetDropDown = $('#datasetDropDown');
            
            Object.keys(window.datasets).forEach(datasetId => {
                dataset = window.datasets[datasetId];
                datasetDropDown.append($(`<option value="${datasetId}">${dataset.name}</option>`));
            })
            if(window.dataAFlag && window.dataBFlag)
                // visObject = DynaSet().loadHarcodedDatasetFromJavascriptObject(window.mergedDataObject);
                visObject = DynaSet().loadHarcodedDatasetFromJavascriptObject(window.datasets[Object.keys(window.datasets)[0]]);
            const timestepLabels = $('.timestepLabel');
            datasetDropDown.on('change', function () {

                datasetSelection.currentId = datasetDropDown.val();
                window.currentDatasetId = datasetSelection.currentId;
                visObject.loadHarcodedDatasetFromJavascriptObject(datasetSelection.currentId);
                selectionPanel.init();
            });

            timestepLabels.on('click', function(e){
                // var timestepIndex = parseInt($(this).attr('timestepIndex'));
                // visObject = DynaSet().loadHarcodedDatasetFromJavascriptObject(datasetSelection.currentId, timestepIndex);
                // visObject.computeGraphLayout(timestepIndex);
            })

            // convertS2toSetData(window.citationIntentDataset["7b2972e2bdd6944338a895c97eecbd12725fdcd8"], window.citationIntentDataset["0404e645cf47f1062de29a02c4791fe5906211db"]);
            selectPaper("7b2972e2bdd6944338a895c97eecbd12725fdcd8", "Narrative Visualization: Telling Stories with Data", "A");
            // selectPaper("0404e645cf47f1062de29a02c4791fe5906211db", "Coupling Story to Visualization: Using Textual Analysis as a Bridge Between Data and Interpretation", "B");
            selectPaper("92f36007d016049f7bf3e47a804e3a99093bcada", "UpSet: Visualization of Intersecting Sets", "B");
            
        },

        toggleDataSetInformation: function () {
            $('#id01').toggle();
        }

    }

}();


const selectionPanel = function () {

    

    function initBaseSetSelection(group) {
        let s = "";
        visObject.getBaseSetNames().forEach((setName, i) => {
            s += `<span class="setCheckbox" ><input type="checkbox" value="${setName}" id="checkbox${group}${i}"><label for="checkbox${group}${i}">${setName}</label></input></span>`;
        });
        return s;
    }

    // function initDegreeSelection(group){
    //     let s = "";
    //     visObject.getBaseSetNames().forEach((setName, i) => {
    //         s += `<option value="${i+1}">${i+1}</option>`;
    //     });
    //     return s;
    // }

    // function initTimestepSelection() {
    //     let s = "";
    //     visObject.getTimesteps().forEach(timestep => {
    //         s += `<option value="${timestep}">${timestep}</option>`;
    //     });
    //     return s;
    // }

    function initPaperSelection() {
        let s = "";
        for(const [paperid, details] of Object.entries(window.datasets))
        {
                var title = details["description"];
                s += `<option value="${paperid}">${title}</option>`;
        }
        return s;
    }

    

    function clearGroupSelection(group) {
        $(`#selection${group} .edgeSelectionText`).hide();
        $(`#selection${group} .selectionForm`).hide();
        $(`#selection${group} .addButton`).show();
        $(`#selection${group} .clearButton`).hide()
        $(`#selection${group} .groupLabel`).removeClass("active");
        // $(`#radio${group}`).attr("disabled", true);
        $(`#selectionAB .groupLabel`).removeClass(`active${group}`);
        window.seedJSON[group] = {};
        convertS2toSetData(window.seedJSON["A"], window.seedJSON["B"]);
        // resetSelection(group);
        // updateQuery(group);
    }

    function updateQuery(group) {
        const operator = $(`#selection${group} .selectionSetOperation`).val();
        const timestep = $(`#selection${group} .selectionTimestep`).val();
        const degree = parseInt($(`#selection${group} .degreeSelection`).val());
        const sets = []
        $(`#selection${group} .selectionSets input:checked`).each((i, checkbox) => {
            sets.push($(checkbox).val());
        });
        visObject.updateQuery(group, operator, sets, timestep, degree);
    }

    function resetSelection(group) {
        $(`#selection${group} input:checked`).prop('checked', false);
        $(`#selection${group} select`).prop("selectedIndex", 0);
    }

    return {

        init: function () {
            $(`#selectionAB .groupLabel`).removeClass("activeA");
            $(`#selectionAB .groupLabel`).removeClass("activeA");
            // this.initGroupSelection("A");
            // this.initGroupSelection("B");
            
        },

        select: function (operator, sets, timestep, degree) {
           
            
            $(`#selection${group} .edgeSelectionText`).attr("style", "display:none");
            $(`#selection${group} .selectionForm`).attr("style", "display:inline");

            clearGroupSelection(group);
            addGroupSelection(group);
            $(`#selection${group} .selectionSetOperation`).val(operator);
            $(`#selection${group} .selectionTimestep`).val(timestep);
            $(`#selection${group} .selectionSets input`).each((i, checkbox) => {
                checkbox.checked = sets.indexOf($(checkbox).val()) >= 0;
            });
            $(`#selection${group} .degreeSelection`).val(degree);
            if(operator == "k-set intersections")
            {
                $(`#selection${group} .selectionSets`).attr("style","display:none");
                $(`#selection${group} .degreeSelection`).attr("style","display:inline");
                $(`#selection${group} .conjunction`).text(", where k = ");

            }
            else
            {
                $(`#selection${group} .selectionSets`).attr("style","display:inline");
                $(`#selection${group} .degreeSelection`).attr("style","display:none");
                $(`#selection${group} .conjunction`).text(" of ");

            }
            // updateQuery(group);
        },

        selectEdge: function (stmt, objects){
            var group = "A";
            if($('#radioA').is(':checked'))
                group = "A";
            else if($('#radioB').is(':checked'))
            {
                group = "B";
            }
            clearGroupSelection(group);
            addGroupSelection(group);
            var container = $(`#selection${group} .edgeSelectionText`).empty();
            container.attr("style", "display:inline");
            d3.select(`#selection${group} .selectionForm`).attr("style", "display:none");
            // container.text(stmt);
            $('<span>&ndash; '+stmt+'</span>').appendTo(container);

            visObject.updateEdgeQuery(group, objects);
        },

        drawGroupSelectionStats: function(countAB, countA, countB)
        {
            // if("A" in window.selectedGroups && "B" in window.selectedGroups)
            {
                $(`#selectionAB .groupAB`).text(seedABText+countAB);
                $("#countAB").text(": "+countAB);
            }
            // if("A" in window.selectedGroups)
            {
                $(`#selectionA .groupA`).text(seedAText+countA);
                $("#countA").text(": "+countA);

            }
            // if("B" in window.selectedGroups)
            {
                $(`#selectionB .groupB`).text(seedBText+countB);
                $("#countB").text(": "+countB);

            }
        },

        addGroupSelection: function(group) {
            $(`#selection${group} .selectionForm`).show();
            $(`#selection${group} .addButton`).hide();
            $(`#selection${group} .clearButton`).show();
            $(`#selection${group} .groupLabel`).addClass("active");
            // $(`#radio${group}`).attr("disabled", false);
            $(`#selectionAB .groupLabel`).addClass(`active${group}`);
            // $(`#radio${group}`).prop("checked", true);
            // updateQuery(group);
        },

        initGroupSelection: function(group, paperDetails) {
            const selectionDiv = $(`#selection${group}`);
            selectionDiv.html("");
            // TODO: implement exclusive intersection
            var text = "";
            switch(group){
                case "A": text = seedAText;
                break;
                case "B": text = seedBText;
                break;
                case "AB": text = seedABText;
                break;
            }
            $(`<span class="groupLabel group${group}">${text} 0</span>
                <span class="edgeSelectionText" style="display:none"></span>
                <span class="selectionForm">
                    &ndash;
                    ${paperDetails}
                    
                </span>`)
                .appendTo(selectionDiv);
            
            $(`<button class="clearButton">x</button>`)
                .click(() => clearGroupSelection(group))
                .appendTo(selectionDiv);
            selectionPanel.addGroupSelection(group);
        }


    }

}();