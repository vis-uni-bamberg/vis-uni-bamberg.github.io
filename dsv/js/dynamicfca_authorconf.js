function DynaSet()
{
    // User interface parameters.
    guiParams = {
        shape:"circle",  // "square" or "circle" --square shape has problems in diff view
        mainVisHeight: 750,
        previewWidth: 100, // When editing, be sure to update CSS values t0o.
        previewHeight: 75,
        previewMargin: 10,
        previewBorder: 1,
        selectionBarHeight: 25,
        authorEvolutionSvgBarsHeight:8,
        authorEvolutionSvgBarsPadding:1,
        authorListRowHeight:30,
        authorListSvgWidth:50,
        authorEvolutionLegendHeight:20,
        authorTimelineBarColor: "black"
    };
    var filenames = [];
    var currentVersion = null;
    var objectSelectedInObjectListBoolean = false;
    var beingDragged = false;
    var dataTableObject;
    var selectedObjectId;
    var weightThreshold;
    var handleClick;
    var mainVisualization;
    var visualization;
    // Visualization parameters.
    visParams = {
        // Any value would do, visualization gets centered anyway.
        bottomY: 0,
        // conceptWidth: 75,
        conceptWidth: 100,
        // conceptWidth: 150,
        // conceptWidth: 200,
        // conceptWidth: 400,
        minConceptHeight: 23,
        conceptMargin: 10,
        conceptPadding: 4,
        dummyWidth: 5,
        dummyMargin: 3,
        // Distance from a dummy node to a layer border.
        dummyLayerMargin: 10,
        objectMinSize: 5,
        objectMaxSize: 15,
        objectMargin: 2,
        minLayerHeight: 50,
        // layerMargin: 100,
        // layerMargin: 100,
        layerMargin: 40,
        zoomStep: 1.05,
        minZoom: 0.2,
        maxZoom: 5,
        // Margins from the edges of the visualization for the initial field of view.
        initialFieldOfViewMargin: 30,
        intentLabelFontSize: 14,
        intentNonLabelRectHeight: 0.4,  //[0, 1] calculated as intentNonLabelRectHeight * intentLabelFontSize
        // intentNonLabelSmallRectHeight: 1,
        intentNonLabelSmallRectHeight: 1.0,

        layerLabelFontSize:25,
        outOfFocusOpacity: 0.3,
        outOfFocusEdgesOpacity: 0.0,
        // outOfFocusConceptOpacity: 0.2,
        outOfFocusConceptOpacity: 1.0,
        // Please only use hex values here.
        // diffColorA: "#ED7D31",
        // diffColorB: "#4472c4",
        diffColorA: "#000000",
        diffColorB: "#000000",
        diffColorAB: "#000000",
        diffStrokeA: "3,3",
        diffStrokeB: "20,5",
        diffStrokeAB: "",
        diffEdgeFillOpacity:0.5,
        highlightColor: "#ffe699",
        previewBarOpacity: 0.4,
        legendBoundingBox:{}
    };
    resizeHandler = null;
    window.diffVersionArray=[];
    window.count=0;


    // Handle file uploads.
    window.fd.logging = false;
    window.fileDropZone = new FileDrop(d3.select("#mainVisualization").node(),
    {
        input: false
    });
    // File upload handler - main entry point for this tool.
    fileDropZone.event("send", function(files)
    {
        console.log(files);
        if (files.length == 0) return;
        // Read all the files and (re)construct the UI when ready.
        var lattices = [];
        filenames = [];
        var filesRead = 0;
        for (var index = 0; index < files.length; index++)
        {
            var file = files[index];
            var reader = new FileReader();
            reader.onload = (function(reader, fileIndex, filename)
            {
                return function(result)
                {
                    // console.log(reader, fileIndex, filename);
                    // Parse the context and construct a lattice for this file.
                    var inputContext = parseContextFromCsv(reader.result);
                    // console.log("input context: ", inputContext);
                    var inputLattice = performFcaOnContext(inputContext);
                    // console.log("input lattice: ", inputLattice);
                    var version = Math.pow(2, fileIndex);
                    lattices[fileIndex] = convertInputToLattice(inputLattice, version);
                    filenames[fileIndex] = filename;
                    filesRead++;
                    if (filesRead == files.length)
                    {
                        // All files has benn read, proceed to processing the lattices and
                        // constructing the UI.
                        // Aggregate all the single lattices.
                        var aggregatedLattice = lattices[0];
                        for (var index = 1; index < lattices.length; index++)
                        {
                            var currentLattice = lattices[index];
                            addLatticeBtoLatticeA(aggregatedLattice, currentLattice);
                        }
                        computeLatticeLayout(aggregatedLattice);
                        computeTransitiveRelations(aggregatedLattice);
                        // console.log("Aggregated lattice with layout", aggregatedLattice);
                        var versions = d3.range(0, lattices.length).map(function(x)
                        {
                            return Math.pow(2, x);
                        });
                        window.allVersions = versions;
                        // (Re)construct the UI.
                        createCopyOfFullName(aggregatedLattice);
                        computeIntersections(aggregatedLattice);
                        deconstructGui();
                        constructGui(aggregatedLattice, versions, filenames);
                        // constructList(lattice);
                    }
                };
            })(reader, index, file.name);
            reader.readAsText(file.nativeFile);
        }
    });

    function createCopyOfFullName(lattice)
    {
        var conceptKeys = Object.keys(lattice.concepts);
        for (var i=0; i<conceptKeys.length; i++)
        {
            lattice.concepts[conceptKeys[i]].copyOfFullName = lattice.concepts[conceptKeys[i]].fullName;
        }
    }

    function computeNodeFilteringMetric(lattice, version)
    {
        var conceptKeys = Object.keys(lattice.concepts);
        for (var i=0; i<conceptKeys.length; i++)
        {
            var currentConcept = lattice.concepts[conceptKeys[i]];
            var objectCount =0;

            if("objectsFiltered" in currentConcept)
                objectCount = currentConcept.objectsFiltered.length;
            else
                objectCount = currentConcept.objects.length;


            // for(var j=0; j<currentConcept.objects.length; j++ )
            // {
            //     if((currentConcept.objects[j].version | version)>0)
            //         objectCount++;
            // }

            var metric = currentConcept.layer * objectCount;
            // Write metric in full name
            // lattice.concepts[conceptKeys[i]].fullName = lattice.concepts[conceptKeys[i]].copyOfFullName +  " ("+ metric +")";
        }
    }

    function vis()
    {
        return this;
    }


    vis.loadHarcodedDatasetFromJavascriptObject = function(datasetIndex)
    {
        var lattices = [];
        filenames = [];
        var filesRead = 0;
        dataObjectKeys = [];
        for (var i = 0; i < dataSets[datasetIndex].length; i++)
        {
            dataObjectKeys.push(Object.keys(dataSets[datasetIndex][i])[0]);
        }
        for (var index = 0; index < dataObjectKeys.length; index++)
        {
            var file = dataObjectKeys[index];
            var reader = new FileReader();
            var content = dataSets[datasetIndex][index][dataObjectKeys[index]];
            // Parse the context and construct a lattice for this file.
            var inputContext = parseContextFromCsv(content.replace(/&&&/g, "\r\n"));
            // console.log("input context: ", inputContext);
            var inputLattice = performFcaOnContext(inputContext);
            // console.log("input lattice: ", inputLattice);
            var version = Math.pow(2, index);
            lattices[index] = convertInputToLattice(inputLattice, version);
            // computeNodeFilteringMetric(lattices[index]);

            filenames[index] = dataObjectKeys[index];
            filesRead++;
            if (filesRead == dataObjectKeys.length)
            {
                // All files have been read, proceed to processing the lattices and
                // constructing the UI.
                // Aggregate all the single lattices.
                var aggregatedLattice = lattices[0];
                for (var tempindex = 1; tempindex < lattices.length; tempindex++)
                {
                    var currentLattice = lattices[tempindex];
                    addLatticeBtoLatticeA(aggregatedLattice, currentLattice);
                }
                computeLatticeLayout(aggregatedLattice);
                // computeNodeFilteringMetric(aggregatedLattice);
                computeTransitiveRelations(aggregatedLattice);
                // console.log("Aggregated lattice with layout", aggregatedLattice);
                var versions = d3.range(0, lattices.length).map(function(x)
                {
                    return Math.pow(2, x);
                });
                // (Re)construct the UI.
                createCopyOfFullName(aggregatedLattice);
                computeIntersections(aggregatedLattice);

                deconstructGui();
                constructGui(aggregatedLattice, versions, filenames);
                // constructList(lattice);
            }
        }


        //This is a bug where I do not know why aggregate button has to be clicked when files are loaded from select data drop down. This is not required when data is loaded by dragging files in svg area.
        $("#buttonPanel input").click();
        return this;
    }

    function computeIntersections(lattice)
    {
        window.allConceptNames = conceptNames(lattice);
         // var colors_g = [ "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
         // window.colors_g = ['#9f1214','#377eb8','#4daf4a','#984ea3','#e6ac00','#a65628'];
         // window.colors_g = ['#9f1214','#377eb8','#984ea3','#1b9e77','#a65628','#d95f02'];
         // window.colors_g = ['#9f1214','#377eb8','#4daf4a','#984ea3','#ff7f00'];
         window.colors_g = ['#1a8e6a','#6762a2','#ec6502','#7cc522','#eb298d', '#9f1214'];

        for( var key in lattice.concepts)
        {
            tempName = lattice.concepts[key].copyOfFullName;
            lattice.concepts[key].intersections=[];
            if(typeof tempName != "undefined")
            {
                var res = tempName.split(", ");
                for(var i=0; i<res.length; i++)
                {
                    pos = allConceptNames.indexOf(res[i]);
                    if(pos>=0)
                    {
                        lattice.concepts[key].intersections.push(colors_g[pos]);
                    }
                }
            }
            // conceptNames.push(lattice.concepts[key].copyOfFullName);
        }
    }

    function conceptNames(lattice)
    {
        // conceptsKeys = Object.keys(lattice.concepts);
        var conceptNames =[];
        var conceptNameDict={};
        // for(var i=0; i<conceptKeys.length; i++ )
        //     conceptNames.append(lattice.concept[])
        for( var key in lattice.concepts)
        {
            tempName = lattice.concepts[key].copyOfFullName;
            if(typeof tempName != "undefined")
            {
                var res = tempName.split(", ");
                for(var i=0; i<res.length; i++)
                {
                    if(!(res[i] in conceptNameDict))
                        conceptNameDict[res[i]]=0;
                }
                // if( res.length==1 && (!(res[i] in conceptNameDict)))
                //     conceptNameDict[res[0]]=lattice.concepts[key].order;

            }
            // conceptNames.push(lattice.concepts[key].copyOfFullName);
        }

        var orderCounter=0;
        for( var key in conceptNameDict)
        {
            conceptNameDict[key] = orderCounter;
            orderCounter+=1;
        }

        // var items = Object.keys(conceptNameDict).map(function(key) {
        //     return [key, conceptNameDict[key]];
        // });

        // // Sort the array based on the second element
        // items.sort(function(first, second) {
        //     return first[1] - second[1];
        // });

        // conceptNamesArray = [];
        // for(var i=0; i<items.length; i++)
        // {
        //     conceptNamesArray.push(items[i][0]);
        // }

        // sort according to the layout left to right from layout
        var tempallconcepts = lattice.concepts;
        var tempDict = {};
        for (var key in tempallconcepts)
        {
            if(tempallconcepts[key]["isDummy"] == false)
            {
                if(tempallconcepts[key]["name"].split(",").length == 1 )
                {

                    if( tempallconcepts[key]["name"] == tempallconcepts[key]["fullName"])
                    {
                        tempDict[tempallconcepts[key]["name"]] = tempallconcepts[key]["position"];
                    }
                }

            }
        }

        var items = Object.keys(tempDict).map(function(key) {
            return [key, tempDict[key]];
        });

        // Sort the array based on the second element
        items.sort(function(first, second) {
            return first[1] - second[1];
        });

        conceptNamesArray = [];
        for(var i=0; i<items.length; i++)
        {
            conceptNamesArray.push(items[i][0]);
        }
        // return Object.keys(conceptNameDict);
        return conceptNamesArray;
    }

    /**
     * Takes a lattice and a set of versions and construct all the UI elements,
     * including the visualizations themselves.
     */
    function constructGui(lattice, versions, versionLabels)
    {
        // Construct main visualization.
        constructList(lattice, versions);

        var mainCanvas = d3.select("#mainVisualization").append("svg").attr("position", "absolute");
        // var legendSVG = d3.select("#mainVisualization").append("svg").attr("position", "absolute");
        // legendSVG = legendSVG.attr("id", "legendSVG");
        // legendSVG.append("g").classed("legend", true);

        mainVisualization = constructVisualization(
        {
            lattice: lattice,
            versions: versions,
            svgCanvas: mainCanvas,
            width: document.getElementById("mainVisualization").offsetWidth,
            height: guiParams.mainVisHeight,
            type: "aggregate",
            isPreview: false
        });
        //@PersonA-
        currentVersion = versions;
        // window.mainVisualization = mainVisualization;
        var svgClickHandler = $("#mainVisualization svg");
        // svgClickHandler
        d3.select("#mainVisualization svg").on("click", function()
        {
            if (d3.event.defaultPrevented) return;
            if (beingDragged) return;
            // d3.event.preventDefault();
            mainVisualization.focusedObject = null;
            mainVisualization.isSelectionActive = false;
            objectSelectedInObjectListBoolean = false;
            dataTableObject.rows('.selected').nodes().to$() // Convert to a jQuery object
                .removeClass('selected');
            render(lattice, currentVersion, mainVisualization, false, false);
        });
        resizeHandler = function(e)
        {
            var width = document.getElementById("mainVisualization").offsetWidth;
            guiParams.mainVisWidth = width;
            mainVisualization.width = width;
            mainVisualization.svgCanvas.attr("width", width);
        };
        window.addEventListener("resize", resizeHandler);
        // Construct navigation.
        var navigateCallback = function(versions, type)
        {
            currentVersion = versions;
            mainVisualization.type = type;
            render(lattice, versions, mainVisualization, true, false);
            render(lattice, currentVersion, mainVisualization, false, true);
            renderList(lattice, versions, type);

        };
        constructNavigation(lattice, versions, versionLabels, navigateCallback);
    }

    function constructList(lattice, versions)
    {
        // d3.select("#listView").html("");
        var objectsInCurrentVersions=[];
        var inactiveElementsIndex = Object.keys(lattice.objects).length;
        var activeElementsIndex=0;
        var dataForTable=[];
        window.authorSelectionEvolutionId=[];
        window.allVersions = versions;
        window.allLattice = lattice;

        for (key in lattice.objects)
        {
            var tempObject = lattice.objects[key];
            var objectPresentFlag = false;
            for(var i=0; i<versions.length; i++)
            {   
                if(tempObject.version & versions[i])
                {
                    objectPresentFlag = true;
                    break;
                }
            }
            if(tempObject.name)
            {
                if(objectPresentFlag)
                {
                    objectsInCurrentVersions.push(tempObject.name);
                    var sumWeights=0;
                    var len=0;
                    for(k in tempObject.weightsInVersions)
                    {
                        kk = +k;
                        if(versions.includes(kk)){
                            len++;
                            sumWeights+=tempObject.weightsInVersions[k];
                        }
                    }
                    dataForTable.push([tempObject.name, activeElementsIndex++, sumWeights]);
                }
                else
                    dataForTable.push([tempObject.name, inactiveElementsIndex++,0]);
            }
        }


        objectsArray=[];

        var objectDict = {};
        window.reverseObjectDict = {};
        for (var key in lattice.objects)
        {
            if (lattice.objects.hasOwnProperty(key))
            {
                objectDict[key] = lattice.objects[key].name;
                reverseObjectDict[lattice.objects[key].name] = key;
            }
        }
        var names = Object.keys(lattice.objects).map(function(key)
        {
            // console.log(lattice.objects[key].id, lattice.objects[key].name );
            objectsArray.push(lattice.objects[key].id);
            return lattice.objects[key].name;
        });
        var dataTableDataset = [];
        for (var v in names)
        {
            // removing null
            if (names[v])
            {
                var temparray = [];
                temparray.push(names[v]);
                dataTableDataset.push(temparray);
            }
        }

        


        window.dataTableArray = objectsArray;
        window.dataTables_clicked_row_index=0;

        $(document).ready(function()
        {
            $('#listExample').DataTable(
            {
                "scrollY": guiParams.mainVisHeight - 100,
                "scrollCollapse": false,
                destroy: true,
                "paging": false,
                "order": [],
                // data: dataTableDataset,
                data: dataForTable,
                columns: [
                {
                    title: "List of objects"
                },
                {
                    title: "Active",
                    visible:false
                },
                {
                    title:"Sum",
                    visible:true,
                    render: $.fn.dataTable.render.number(',', '.', 2)
                }]
               
            });
            var table = $('#listExample').DataTable();
            dataTableObject = table;

            $('#listExample tr').addClass(function(index, currentClass)
            {
                // console.log($(this));
                // if( objectsInCurrentVersions.indexOf($(this)[0].childNodes[0].innerText)>-1)
                var sumColumn =  parseFloat($(this)[0].childNodes[1].innerText.replace(",", ""));
                // console.log(sumColumn);
                if(sumColumn>0)
                        return 'activeListItem';
                else
                        return 'inactiveListItem';
            });

            $('#listExample tbody').off('click');
            $('#listExample tbody').on('click', 'tr', function()
            {
                window.dataTables_clicked_row_index = $(this).index();
                console.log(dataTables_clicked_row_index);
                if ($(this).hasClass('selected'))
                {
                    $(this).removeClass('selected');
                    mainVisualization.focusedObject = null;
                    mainVisualization.isSelectionActive = false;
                    objectSelectedInObjectListBoolean = false;
                    render(lattice, currentVersion, mainVisualization, false, true);
                }
                else
                {
                    table.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                    var data = table.row(this).data();
                    var objectEdge = lattice.objects[reverseObjectDict[data[0]]];
                    var object = lattice.objects[objectEdge.id];
                    mainVisualization.focusedObject = object.id;
                    mainVisualization.isSelectionActive = true;
                    objectSelectedInObjectListBoolean = true;
                    selectedObjectId = object.id;
                    render(lattice, currentVersion, mainVisualization, false, true);
                    drawAuthorEvolution(selectedObjectId, object);
                                        
                }
            });

            $('.dataTables_scrollHead').on('click', function()
            {
                // datatable.order([1,"asc"], table.order());
                // console.log(table.order());
                // console.log(table.rows().data());
                var tdata = table.rows().data();
                tarray=[];
                for (var i=0; i<tdata.length; i++)
                {
                    tarray.push(parseInt(reverseObjectDict[tdata[i][0]]));
                }
                // console.log(tarray);
                dataTableArray = tarray;
                render(lattice, currentVersion, mainVisualization, true, false);
                render(lattice, currentVersion, mainVisualization, true, false);

            });
        });
    }

    function drawAuthorEvolution(selectedObjectId, object)
    {
        if(authorSelectionEvolutionId.indexOf(selectedObjectId)<0)
        {
            authorSelectionEvolutionId.push(selectedObjectId);
            window.authorEvolutionSvgHeight = (allConceptNames.length)*(guiParams.authorEvolutionSvgBarsHeight+ guiParams.authorEvolutionSvgBarsPadding);
            var tr = d3.select("#navigation table tbody").append("tr").attr("class", "authorEvolutionRow").attr("id",selectedObjectId ).attr('style','padding-top:15px');
            var authorNametd = tr.append("td");


            authorNametd.append("span").attr("style","padding-left:6px").text(object.name+": ");
            evolutionSvgContainer = tr.append("div").attr("id","authorEvolutionDiv").attr("class", "authorEvolutionDiv").attr("height", authorEvolutionSvgHeight);

            tr.append("td").append("img").attr("src","images/close.png")
                        .attr("height","20px")
                        .attr("width","20px")
                        .attr("style", "border:1;position:absolute")
                        .on("click", function(d,i){
                            var t = d3.select(this);
                            var td = t[0][0].parentNode;
                            console.log(d,i, t[0][0].parentNode.parentNode.id);
                            var oid = parseInt(t[0][0].parentNode.parentNode.id);
                            var index = authorSelectionEvolutionId.indexOf(oid);
                            if (index > -1) {
                              authorSelectionEvolutionId.splice(index, 1);
                            }

                            t[0][0].parentNode.parentNode.remove();

                        })
                        .on("mouseover", function(d,i) {
                            d3.select(this).transition()
                                .ease("ease-in")
                                .duration("200")
                                .attr("height","30px")
                                .attr("width","30px");

                        })
                        .on("mouseout", function(d,i) {
                            d3.select(this).transition()
                                .ease("ease-out")
                                .delay("100")
                                .duration("200")
                                .attr("height","20px")
                                .attr("width","20px");
                        } );

            for(var i=0; i< window.allVersions.length; i++)
            {
                

                var div = evolutionSvgContainer.append("div").classed("svgContainer preview", true).attr("style","border:1px;border-color:white;border-style:solid");
                // div.append('svg')
                //         .attr("width", guiParams.previewWidth)
                //         .attr("height", "20px");
                // var x = d3.scale.linear()
                        // .range([0, width]);
                var barscale = d3.scale.linear().domain([0, objectSizeScale[1]]).range([0, guiParams.previewWidth*(3/4.0)]);
                
                var outertickheight = guiParams.authorEvolutionLegendHeight*4.0/10;
                var fontsize = guiParams.authorEvolutionLegendHeight*6.0/10;

                var svg = div.append('svg').classed("evolutionSVG", true)
                        .attr("width", guiParams.previewWidth)
                        .attr("height", authorEvolutionSvgHeight+guiParams.authorEvolutionLegendHeight);
                
                // svg.append("g")
                //       .attr("class", "x axis")
                //       .attr("transform", "translate(0," + guiParams.authorEvolutionLegendHeight + ")")    
                //       .call(xAxis);

                svg.append('line')
                    .attr("x1", guiParams.previewWidth/4)
                    .attr("y1", guiParams.authorEvolutionLegendHeight - outertickheight)
                    .attr("x2", guiParams.previewWidth/4)
                    .attr("y2", guiParams.authorEvolutionLegendHeight )
                    .attr('style','stroke:black');

                svg.append('text').append('tspan')
                    .text("0")
                    .attr('text-anchor',"middle")
                    .attr("x", guiParams.previewWidth/4)
                    .attr("y", (guiParams.authorEvolutionLegendHeight - outertickheight) - 3)
                    .attr("style","font-size:"+fontsize);

                svg.append('line')
                    .attr("x1", guiParams.previewWidth -1)
                    .attr("y1", guiParams.authorEvolutionLegendHeight - outertickheight)
                    .attr("x2", guiParams.previewWidth -1)
                    .attr("y2", guiParams.authorEvolutionLegendHeight )
                    .attr('style','stroke:black');

                svg.append('text').append('tspan')
                    .text(parseFloat(objectSizeScale[1]).toFixed(2))
                    .attr('text-anchor',"end")
                    .attr("x", guiParams.previewWidth -1)
                    .attr("y", (guiParams.authorEvolutionLegendHeight - outertickheight) - 3)
                    .attr("style","font-size:"+fontsize);

                numberofinnerticks=4;

                for(var ticks=0; ticks<numberofinnerticks; ticks++)
                {   
                     svg.append('line')
                    .attr("x1", (guiParams.previewWidth/4.0 + ticks*(guiParams.previewWidth*3/4.0)/numberofinnerticks) )
                    .attr("y1", guiParams.authorEvolutionLegendHeight - outertickheight*0.6)
                    .attr("x2", (guiParams.previewWidth/4.0 + ticks*(guiParams.previewWidth*3/4.0)/numberofinnerticks) )
                    .attr("y2", guiParams.authorEvolutionLegendHeight )
                    .attr('style','stroke:black; stroke-opacity: 0.5');
                }


                objectConcepts = object.concepts;
                var filteredObjectConcepts=[];
                for(var j=0; j<objectConcepts.length; j++)
                {
                    if(allVersions[i] in objectConcepts[j].weights)
                        filteredObjectConcepts.push(objectConcepts[j]);
                }

                intersectionDict={};
                conceptDict={};
                contributions={};
                for(var item in allConceptNames){
                    contributions[allConceptNames[item]] = 0;
                }

                for(var j=0; j<filteredObjectConcepts.length; j++)
                {
                    var n = window.allLattice.concepts[filteredObjectConcepts[j].conceptId].name;
                    if(n.length>0)
                    {
                        conceptDict[n]=true;
                        if(objectConcepts[j].weights[allVersions[i]])
                            contributions[n] = objectConcepts[j].weights[allVersions[i]];
                    }
                }
                var conceptDictArray = Object.keys(conceptDict);

                conceptDictArray.sort(function(a, b)
                                        {  
                                          return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
                                        });

                conceptDictArray.forEach(function(attr, index)
                {
                    pos = allConceptNames.indexOf(attr);
                    {   var pad =0;
                        var labelPad= 1;
                        var conceptTopPad = 0;
                        fillColor = colors_g[pos];
                        svg.append('rect')
                            .attr("class", "textBackground")
                            .attr("x",guiParams.previewWidth/4)
                            .attr("y", (guiParams.authorEvolutionLegendHeight+  pos * (guiParams.authorEvolutionSvgBarsHeight + guiParams.authorEvolutionSvgBarsPadding) ))
                            .attr("width", barscale(contributions[attr]))
                            .attr("height", guiParams.authorEvolutionSvgBarsHeight )
                            .attr("fill", guiParams.authorTimelineBarColor);

                        svg.append('rect')
                            .attr("class", "textBackground")
                            .attr("x", 3)
                            .attr("y", (guiParams.authorEvolutionLegendHeight+  pos * (guiParams.authorEvolutionSvgBarsHeight + guiParams.authorEvolutionSvgBarsPadding) ))
                            .attr("rx", 2)
                            .attr("ry", 2)
                            .attr("width", guiParams.previewWidth/4 - 6)
                            // .attr("width", guiParams.authorEvolutionSvgBarsHeight)
                            .attr("height", guiParams.authorEvolutionSvgBarsHeight )
                            .attr("fill", fillColor);
                    }
                });

                svg.append("line")
                    .attr("x1", guiParams.previewWidth/4  )
                    .attr("y1", guiParams.authorEvolutionLegendHeight+ 0 )
                    .attr("x2", guiParams.previewWidth/4 )
                    .attr("y2", guiParams.authorEvolutionLegendHeight +  authorEvolutionSvgHeight )
                    .attr("style", "stroke:rgb(200,200,200);stroke-width:2" );

                svg.append("rect")
                        .attr("x",0)
                        .attr("y",guiParams.authorEvolutionLegendHeight)
                        .attr("width", guiParams.previewWidth)
                        .attr("height", authorEvolutionSvgHeight)
                        .attr("style","stroke-width: 2px; stroke:black; fill:none");
            }

        }

    }

    function renderList(lattice, versions, type)
    {
        var objectsInCurrentVersions=[];
        var inactiveElementsIndex = Object.keys(lattice.objects).length;
        var activeElementsIndex=0;
        var dataForTable=[];
        var maxContributionsInSelectedTimestamps = -1;

        for (key in lattice.objects)
        {
            var tempObject = lattice.objects[key];
            var objectPresentFlag = false;
            for(var i=0; i<versions.length; i++)
            {   
                if(tempObject.version & versions[i])
                {
                    objectPresentFlag = true;
                    break;
                }
            }
            if(tempObject.name)
            {
                 if(objectPresentFlag)
                {
                    objectsInCurrentVersions.push(tempObject.name);
                    var sumWeights=0;
                    var len=0;
                    for(k in tempObject.weightsInVersions)
                    {
                        kk = +k;
                        if(versions.includes(kk)){
                            len++;
                            sumWeights+=tempObject.weightsInVersions[k];
                        }
                    }
                    dataForTable.push([tempObject.name, activeElementsIndex++, sumWeights]);
                    if(maxContributionsInSelectedTimestamps< sumWeights) maxContributionsInSelectedTimestamps = sumWeights;
                }
                else
                    dataForTable.push([tempObject.name, inactiveElementsIndex++,0]);
            }
        }
        datatable = $('#listExample').DataTable();

        datatable.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
            // var d = this.data();
            this.data(dataForTable[rowIdx]) ;
         
            // d.counter++; // update data source for the row
         
            // this.invalidate(); // invalidate the data DataTables has cached for this row
        } );
        //  datatable.clear();
        // datatable.order([1,"asc"]);
        // datatable.rows.add(dataForTable);
        datatable.draw();
        // console.log(dataTables_clicked_row_index);
        // if(mainVisualization.focusedObject!=null)
        //     datatable.row(dataTables_clicked_row_index).scrollTo(false);

        var objectsInCurrentVersions=[];
        for (key in lattice.objects)
        {
            var tempObject = lattice.objects[key];
            var objectPresentFlag = false;
            for(var i=0; i<versions.length; i++)
            {   
                if(tempObject.version & versions[i])
                {
                    objectPresentFlag = true;
                    break;
                }
            }
            if(objectPresentFlag)
                objectsInCurrentVersions.push(tempObject.name);
        }
        $('#listExample tr').removeClass('activeListItem');
        $('#listExample tr').removeClass('inactiveListItem');

        
        $('#listExample tbody tr').addClass(function(index, currentClass)
            {
                // console.log(index, currentClass);
                // var tableRowArray = $('#listExample tr td');
                // console.log($(this)[0].innerText);
                d3.select(this).attr("height", guiParams.authorListRowHeight);
                d3.select(this.childNodes[0]).attr("height", guiParams.authorListRowHeight);

                // console.log($(this));
                var objectName = this.childNodes[0].innerHTML;
                d3.select(this.childNodes[0]).html("");
                // console.log(this.childNodes[0]);

                var authorSvg = d3.select(this.childNodes[0]).insert("svg", "td");
                authorSvg.attr('style', 'background-color: white');
               
                
                var span = d3.select(this.childNodes[0]).append("span").attr('style','margin-left:5px');
                span.text(objectName);
                drawAuthorSetMembership(lattice, authorSvg, versions, objectName, maxContributionsInSelectedTimestamps, type);

            });
        $('#listExample tr').addClass(function(index, currentClass)
            {
                // console.log($(this));
                // if( objectsInCurrentVersions.indexOf($(this)[0].childNodes[0].innerText)>-1)
                var sumColumn =  parseFloat($(this)[0].childNodes[1].innerText.replace(",", ""));
                // console.log(sumColumn);
                if(sumColumn>0)

                        return 'activeListItem';
                else
                        return 'inactiveListItem';
            });
    }

    function drawAuthorSetMembership(lattice, svg, versions, objectName, maxContributionsInSelectedTimestamps, type)
    {
        var objectEdge = lattice.objects[reverseObjectDict[objectName]];
        var object = lattice.objects[objectEdge.id];
        var individualBarPadding = 0.5;
        // var svgheight = (allConceptNames.length)*(guiParams.authorEvolutionSvgBarsHeight+ guiParams.authorEvolutionSvgBarsPadding);
        var svgheight = guiParams.authorListRowHeight;
        var individualBarHeight = svgheight/(2*individualBarPadding + allConceptNames.length);
        var individualBarHeightWithPadding = svgheight/( allConceptNames.length);
        console.log(individualBarHeight, individualBarPadding, individualBarHeightWithPadding  );

        svg.attr('width', guiParams.authorListSvgWidth)
            .attr("height", svgheight);
        

                        if(versions.length==1)
                        {
                            i=0;
                            

                            objectConcepts = object.concepts;
                            var filteredObjectConcepts=[];
                            for(var j=0; j<objectConcepts.length; j++)
                            {
                                if(versions[i] in objectConcepts[j].weights)
                                    filteredObjectConcepts.push(objectConcepts[j]);
                            }

                            intersectionDict={};
                            conceptDict={};
                            contributions={};
                            for(var item in allConceptNames){
                                contributions[allConceptNames[item]] = 0;
                            }

                            for(var j=0; j<filteredObjectConcepts.length; j++)
                            {
                                var n = lattice.concepts[filteredObjectConcepts[j].conceptId].name;
                                if(n.length>0)
                                {
                                    conceptDict[n]=true;
                                    if(objectConcepts[j].weights[versions[i]])
                                        contributions[n] = objectConcepts[j].weights[versions[i]];
                                }
                            }
                            var conceptDictArray = Object.keys(conceptDict);

                            conceptDictArray.sort(function(a, b)
                                                    {  
                                                      return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
                                                    });

                            
                            conceptDictArray.forEach(function(attr, index)
                            {
                                pos = allConceptNames.indexOf(attr);
                                {   var pad =0;
                                    var labelPad= 1;
                                    var conceptTopPad = 0;
                                    fillColor = colors_g[pos];
                                    barscale = d3.scale.linear().domain([0, maxContributionsInSelectedTimestamps]).range([guiParams.authorListSvgWidth/2, guiParams.authorListSvgWidth]);
                                    svg.append('rect')
                                        .attr("class", "textBackground")
                                        .attr("x",0)
                                        .attr("y", ( (pos * (individualBarHeightWithPadding))+ individualBarPadding ))
                                        // .attr("width", barscale(contributions[attr]))
                                        .attr("width", guiParams.authorListSvgWidth)
                                        .attr("height", individualBarHeight )
                                        .attr("fill", fillColor);
                                }
                            });
                            // svg.append("line")
                            //     .attr("x1", guiParams.authorListSvgWidth/2  )
                            //     .attr("y1", 0 )
                            //     .attr("x2", guiParams.authorListSvgWidth/2 )
                            //     .attr("y2",  svgheight )
                            //     .attr("style", "stroke:rgb(200,200,200);stroke-width:2" );
                        }
                        else if(versions.length==2 && type=="diff")
                        {
                            for(i=0;i<2;i++)
                            {

                                objectConcepts = object.concepts;
                                var filteredObjectConcepts=[];
                                for(var j=0; j<objectConcepts.length; j++)
                                {
                                    if(versions[i] in objectConcepts[j].weights)
                                        filteredObjectConcepts.push(objectConcepts[j]);
                                }

                                intersectionDict={};
                                conceptDict={};
                                contributions={};
                                for(var item in allConceptNames){
                                    contributions[allConceptNames[item]] = 0;
                                }

                                for(var j=0; j<filteredObjectConcepts.length; j++)
                                {
                                    var n = lattice.concepts[filteredObjectConcepts[j].conceptId].name;
                                    if(n.length>0)
                                    {
                                        conceptDict[n]=true;
                                        if(objectConcepts[j].weights[versions[i]])
                                            contributions[n] = objectConcepts[j].weights[versions[i]];
                                    }
                                }
                                var conceptDictArray = Object.keys(conceptDict);

                                conceptDictArray.sort(function(a, b)
                                                        {  
                                                          return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
                                                        });

                                
                                conceptDictArray.forEach(function(attr, index)
                                {
                                    pos = allConceptNames.indexOf(attr);
                                    {   var pad =0;
                                        var labelPad= 1;
                                        var conceptTopPad = 0;
                                        fillColor = colors_g[pos];
                                        barscale = d3.scale.linear().domain([0, maxContributionsInSelectedTimestamps]).range([guiParams.authorListSvgWidth/2, guiParams.authorListSvgWidth]);
                                        svg.append('rect')
                                            .attr("class", "textBackground")
                                            .attr("x",i*guiParams.authorListSvgWidth/2)
                                            .attr("y", ( (pos * (individualBarHeightWithPadding))+ individualBarPadding ))
                                            // .attr("width", barscale(contributions[attr]))
                                            .attr("width", guiParams.authorListSvgWidth/2)
                                            .attr("height", individualBarHeight )
                                            .attr("fill", fillColor);
                                    }
                                });
                                svg.append("line")
                                    .attr("x1", guiParams.authorListSvgWidth/2  )
                                    .attr("y1", 0 )
                                    .attr("x2", guiParams.authorListSvgWidth/2 )
                                    .attr("y2",  svgheight )
                                    .attr("style", "stroke:rgb(255,255,255);stroke-width:2" );
                            }
                        }

                        else
                        {
                            unionConceptDict={};

                            for(i=0;i<versions.length;i++)
                            {

                                objectConcepts = object.concepts;
                                var filteredObjectConcepts=[];
                                for(var j=0; j<objectConcepts.length; j++)
                                {
                                    if(versions[i] in objectConcepts[j].weights)
                                        filteredObjectConcepts.push(objectConcepts[j]);
                                }

                                intersectionDict={};
                                conceptDict={};
                                contributions={};
                                for(var item in allConceptNames){
                                    contributions[allConceptNames[item]] = 0;
                                }

                                for(var j=0; j<filteredObjectConcepts.length; j++)
                                {
                                    var n = lattice.concepts[filteredObjectConcepts[j].conceptId].name;
                                    if(n.length>0)
                                    {
                                        conceptDict[n]=true;
                                        if(objectConcepts[j].weights[versions[i]])
                                            contributions[n] = objectConcepts[j].weights[versions[i]];
                                    }
                                }

                                for(var k in conceptDict)
                                {
                                    if(conceptDict[k]==true) unionConceptDict[k]=true;
                                }

                            }
                                var conceptDictArray = Object.keys(unionConceptDict);

                                conceptDictArray.sort(function(a, b)
                                                        {  
                                                          return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
                                                        });

                                
                                conceptDictArray.forEach(function(attr, index)
                                {
                                    pos = allConceptNames.indexOf(attr);
                                    {   var pad =0;
                                        var labelPad= 1;
                                        var conceptTopPad = 0;
                                        fillColor = colors_g[pos];
                                        barscale = d3.scale.linear().domain([0, maxContributionsInSelectedTimestamps]).range([guiParams.authorListSvgWidth/2, guiParams.authorListSvgWidth]);
                                        svg.append('rect')
                                            .attr("class", "textBackground")
                                            .attr("x",0)
                                            .attr("y", ( (pos * (individualBarHeightWithPadding))+ individualBarPadding ))
                                            // .attr("width", barscale(contributions[attr]))
                                            .attr("width", guiParams.authorListSvgWidth)
                                            .attr("height", individualBarHeight )
                                            .attr("fill", fillColor);
                                    }
                                });
                                // svg.append("line")
                                //     .attr("x1", guiParams.authorListSvgWidth/2  )
                                //     .attr("y1", 0 )
                                //     .attr("x2", guiParams.authorListSvgWidth/2 )
                                //     .attr("y2",  svgheight )
                                //     .attr("style", "stroke:rgb(200,200,200);stroke-width:2" );
                            
                        }
         svg.append("rect")
            .attr("x",0)
            .attr("y",0)
            .attr('style', 'stroke-width:2px;stroke:black;fill:none')
            .attr('width', guiParams.authorListSvgWidth)
            .attr('height', svgheight);
    }

    function deconstructGui()
    {
        d3.select("#mainVisualization").html("");
        // d3.select("#navigation").html("");
        d3.select("#diffPreviewContainerRow").html("");
        d3.select("#individualVersionRow").html("");
        d3.select("#selectionBar").html("");
        d3.select("#buttonPanel").html("");
        d3.selectAll(".authorEvolutionRow").remove();
        window.removeEventListener("resize", resizeHandler);
    }
    /////////////////// Lattice data processing ///////////////////
    /**
     * Takes a CSV string and parses it into a context object.
     */
    function parseContextFromCsv(text)
    {
        var context = {
            attributes:
            {},
            objects:
            {}
        };
        var rows = d3.csv.parseRows(text);
        // First row is a header with object names.
        var header = rows.shift();
        // Other rows correspond to attributes.
        var attributesRaw = rows.map(function(e)
        {
            return e[0];
        });
        // First column in the header is empty.
        header.shift();
        var objectsRaw = header;
        // Create attributes in the context;
        attributesRaw.forEach(function(attr, i)
        {
            var attribute = {
                id: hash(attr),
                name: attr,
                objects: [],
                weights: []
            };
            context.attributes[attribute.id] = attribute;
        });
        // Create objects in the context.
        objectsRaw.forEach(function(obj, i)
        {
            var object = {
                id: hash(obj),
                name: obj,
                attributes: [],
                weights: []
            };
            context.objects[object.id] = object;
        });
        // Load object-attribute assignments data.
        // var attributesList = d3.values(context.attributes);
        var attributesList = [];
        for (var i = 0; i < attributesRaw.length; i++)
        {
            attributesList.push(context.attributes[hash(attributesRaw[i])]);
        }
        // var objectsList = d3.values(context.objects);
        var objectsList = [];
        for (var i = 0; i < objectsRaw.length; i++)
        {
            objectsList.push(context.objects[hash(objectsRaw[i])]);
        }
        for (var attributeIndex = 0; attributeIndex < rows.length; attributeIndex++)
        {
            var row = rows[attributeIndex];
            // First column in each row is the attribute's name.
            row.shift();
            for (var objectIndex = 0; objectIndex < row.length; objectIndex++)
            {
                // var weight = parseInt(row[objectIndex], 10);
                var weight = parseFloat(row[objectIndex], 10);
                weightThreshold = 0.0;
                if (weight > weightThreshold)
                {
                    var attribute = attributesList[attributeIndex];
                    var object = objectsList[objectIndex];
                    attribute.objects.push(object.id);
                    attribute.weights.push(weight);
                    object.attributes.push(attribute.id);
                    object.weights.push(weight);
                }
            }
        }
        return context;
    }
    /**
     * Run the NextClosure algorithm on the context object, generating
     * an "input lattice" as a result.
     * An "input lattice" is a concise representation of a single lattice,
     * that is suitable for text representation.
     */
    function performFcaOnContext(context)
    {
        var attributesArray = d3.values(context.attributes).map(function(attr)
        {
            return attr.id;
        });
        // NextClosure algorithm.
        var intents = [];
        var currentIntent = closure([]);
        while (currentIntent != null && currentIntent.length != context.attributes.length)
        {
            intents.push(currentIntent);
            currentIntent = getLeastGreaterIntent(currentIntent);
        }
        // We've computed all the intents, the algorithm is finished.
        // The first and the last intents are uninteresting.
        /*
         The program throws error if there is no "valid" lattice structure
            eg.
            ,A,B
            c1,0.6,1
            c2,1,0.6
            c3,1,0.2

            is not a valid input (for the program) - as every author is contributing in every module. And the program deletes the first and last intents (line 367 and 368) as they are trivial cases which signify null set and complete set.

            Solution - To avoid this it can be checked that whether the intent array has how many inputs. Minimum it should have 3 for program to run without error. Adding the following if condition for this check

            */
        // if(intents.length>2)
        // {
        intents.shift();
        //     intents.pop();
        // }
        // Create an empty lattice.
        var lattice = {
            concepts: null,
            objects: null,
            attributes: null,
            conceptToConcept: null
        };
        // Build a concept list from the list of intents.
        lattice.concepts = intents.map(function(intent, i)
        {
            var intentString = intent.reduce(function(result, current)
            {
                return result + "," + current;
            }, "");
            var concept = {
                id: hash(intentString),
                name: "",
                intent: intent,
                layer: intent.length,
                objects: [],
                // Attributes that are part of the intent of the other concept,
                // which is a generalization of this one (there's an edge from it to this one in the lattice).
                // The field is used for reduced labeling.
                inheritedIntent: []
            };
            // Build a list of objects based on the extent.
            getExtent(intent).forEach(function(objectId)
            {
                // Compute total weight as a sum of weights between the object and attributes in this concept.
                var attributesInThisConcept = intent.map(function(attrId)
                {
                    return context.attributes[attrId];
                });
                var totalWeight = attributesInThisConcept.reduce(function(totalWeight, attr)
                {
                    var objectIndex = attr.objects.indexOf(objectId);
                    if (objectIndex != -1) return totalWeight + attr.weights[objectIndex];
                    return totalWeight;
                }, 0);
                // Create an object in the lattice.
                concept.objects.push(
                {
                    object: objectId,
                    weight: totalWeight
                });
            });
            return concept;
        });
        // Build an objects list.
        lattice.objects = d3.values(context.objects).map(function(object)
        {
            return {
                id: object.id,
                name: object.name
            };
        });
        // Build an attributes list.
        lattice.attributes = d3.values(context.attributes).map(function(attribute)
        {
            return {
                id: attribute.id,
                name: attribute.name
            };
        });
        // Compute and save concept-concept relations.
        lattice.conceptToConcept = [];
        for (var i = 0; i < lattice.concepts.length; i++)
        {
            var conceptA = lattice.concepts[i];
            for (var j = 0; j < lattice.concepts.length; j++)
            {
                var conceptB = lattice.concepts[j];
                if (i != j && isSubset(conceptA.intent, conceptB.intent))
                {
                    lattice.conceptToConcept.push(
                    {
                        from: conceptA.id,
                        to: conceptB.id
                    });
                    Array.prototype.push.apply(conceptB.inheritedIntent, conceptA.intent);
                }
            }
        }
        // Perform transitive edge reduction.
        var findEdge = function(conceptIdA, conceptIdB)
        {
            return lattice.conceptToConcept.find(function(edge)
            {
                return edge.from == conceptIdA && edge.to == conceptIdB;
            });
        };
        for (i = 0; i < lattice.concepts.length; i++)
        {
            conceptA = lattice.concepts[i];
            for (j = 0; j < lattice.concepts.length; j++)
            {
                conceptB = lattice.concepts[j];
                for (var k = 0; k < lattice.concepts.length; k++)
                {
                    var conceptC = lattice.concepts[k];
                    var edgeAB = findEdge(conceptA.id, conceptB.id);
                    var edgeBC = findEdge(conceptB.id, conceptC.id);
                    var edgeAC = findEdge(conceptA.id, conceptC.id);
                    if (edgeAB && edgeBC && edgeAC)
                    {
                        var index = lattice.conceptToConcept.indexOf(edgeAC);
                        lattice.conceptToConcept.splice(index, 1);
                    }
                }
            }
        }
        // Apply the 'reduced labeling' to the concepts.
        lattice.concepts.forEach(function(concept)
        {
            // Labels should be sorted alphabetically.
            var comparator = function(id1, id2)
            {
                return -context.attributes[id1].name.localeCompare(context.attributes[id2].name);
            };
            concept.intent.sort(comparator);
            concept.inheritedIntent.sort(comparator);
            // the reduced label of the concept is the list of its non-inherited attributes.
            var notInheritedAttributes = subtract(concept.intent, concept.inheritedIntent);
            var conceptLabel = notInheritedAttributes.reduce(function(result, attrId)
            {
                return result + context.attributes[attrId].name + ", ";
            }, "");
            conceptLabel = conceptLabel.slice(0, -2);
            // The full label of the concept is the list of all of its attributes.
            var fullConceptLabel = concept.intent.reduce(function(result, attrId)
            {
                return result + context.attributes[attrId].name + ", ";
            }, "");
            fullConceptLabel = fullConceptLabel.slice(0, -2);
            concept.name = conceptLabel;
            concept.fullName = fullConceptLabel;
        });
        return lattice;

        function getLeastGreaterIntent(intent)
        {
            for (var i = attributesArray.length - 1; i >= 0; i--)
            {
                var circledPlusResult = circledPlusOperation(intent, i);
                if (isLexicographicallySmaller(intent, circledPlusResult, i)) return circledPlusResult;
            }
            return null;
        }

        function circledPlusOperation(intent, attributeIndex)
        {
            var precedingAttributes = getPrecedingAttributes(attributeIndex);
            var intersection = intersect(intent, precedingAttributes);
            intersection.push(attributesArray[attributeIndex]);
            return closure(intersection);
        }

        function isLexicographicallySmaller(intentA, intentB, attributeIndex)
        {
            var attrId = attributesArray[attributeIndex];
            var isInDiff = subtract(intentB, intentA).indexOf(attrId) != -1;
            if (!isInDiff) return false;
            var precedingAttributes = getPrecedingAttributes(attributeIndex);
            var intersectionA = intersect(intentA, precedingAttributes);
            var intersectionB = intersect(intentB, precedingAttributes);
            return arraysAreEqual(intersectionA, intersectionB);
        }

        function getPrecedingAttributes(attributeIndex)
        {
            var precedingAttributes = [];
            for (var i = 0; i < attributesArray.length && i < attributeIndex; i++)
            {
                precedingAttributes.push(attributesArray[i]);
            }
            return precedingAttributes;
        }

        function arraysAreEqual(arrayA, arrayB)
        {
            if (arrayA === arrayB) return true;
            if (arrayA == null || arrayB == null) return false;
            if (arrayA.length != arrayB.length) return false;
            arrayA.sort();
            arrayB.sort();
            for (var i = 0; i < arrayA.length; ++i)
            {
                if (arrayA[i] !== arrayB[i]) return false;
            }
            return true;
        }

        function isSubset(subset, superset)
        {
            return arraysAreEqual(subset, intersect(subset, superset));
        }

        function subtract(arrayA, arrayB)
        {
            return arrayA.filter(function(element)
            {
                return arrayB.indexOf(element) === -1;
            });
        }

        function intersect(arrayA, arrayB)
        {
            return arrayA.filter(function(element)
            {
                return arrayB.indexOf(element) != -1;
            });
        }

        function closure(intent)
        {
            return getIntent(getExtent(intent));
        }

        function getExtent(intent)
        {
            var extent = [];
            var objects = d3.values(context.objects);
            for (var i = 0; i < objects.length; i++)
            {
                var object = objects[i];
                var objectIsInExtent = true;
                for (var j = 0; j < intent.length; j++)
                {
                    var attribute = intent[j];
                    objectIsInExtent = objectIsInExtent && (object.attributes.indexOf(attribute) >= 0);
                    if (!objectIsInExtent) break;
                }
                if (objectIsInExtent) extent.push(object.id);
            }
            return extent;
        }

        function getIntent(extent)
        {
            var intent = [];
            var attributes = d3.values(context.attributes);
            for (var i = 0; i < attributes.length; i++)
            {
                var attribute = attributes[i];
                var attrIsInIntent = true;
                for (var j = 0; j < extent.length; j++)
                {
                    var object = extent[j];
                    attrIsInIntent = attrIsInIntent && (attribute.objects.indexOf(object) >= 0);
                    if (!attrIsInIntent) break;
                }
                if (attrIsInIntent) intent.push(attribute.id);
            }
            return intent;
        }
    }
    /**
     * Converts an "input lattice" to a lattice object, which is capable
     * of representing multiple lattices and is suitable for rendering.
     * (e.g. IDs are replaced by actual object references)
     */
    function convertInputToLattice(input, version)
    {
        var tempConcepts = [];
        for (var j = 0; j < input.concepts.length; j++)
        {
            conceptId = input.concepts[j].id;
            if (input.concepts[j].objects.length == 0)
            {
                // delete input.concepts[conceptId];
                var tempconceptToConcepts = [];
                for (var i = 0; i < input.conceptToConcept.length; i++)
                {
                    if (input.conceptToConcept[i].from != conceptId && input.conceptToConcept[i].to != conceptId) tempconceptToConcepts.push(input.conceptToConcept[i]);
                }
                input.conceptToConcept = tempconceptToConcepts;
            }
            else
            {
                tempConcepts.push(input.concepts[j]);
            }
        }
        input.concepts = tempConcepts;
        var i, object, concept;
        var lattice = {
            concepts:
            {},
            objects:
            {}
        };
        // Construct concepts.
        for (i = 0; i < input.concepts.length; i++)
        {
            var inputConcept = input.concepts[i];
            concept = {
                id: inputConcept.id,
                name: inputConcept.name ? inputConcept.name : "",
                fullName: inputConcept.fullName ? inputConcept.fullName : "",
                intent: inputConcept.intent ? inputConcept.intent : [],
                version: version,
                layer: inputConcept.layer,
                parents: [],
                children: [],
                objects: []
            };
            lattice.concepts[concept.id] = concept;
        }
        // Construct objects.
        for (i = 0; i < input.objects.length; i++)
        {
            var inputObject = input.objects[i];
            object = {
                id: inputObject.id,
                name: inputObject.name,
                version: version,
                concepts: []
            };
            lattice.objects[object.id] = object;
        }
        // Resolve concept relations.
        for (i = 0; i < input.conceptToConcept.length; i++)
        {
            var inputConceptLink = input.conceptToConcept[i];
            var conceptFrom = lattice.concepts[inputConceptLink.from];
            var conceptTo = lattice.concepts[inputConceptLink.to];
            conceptFrom.children.push(
            {
                conceptId: conceptTo.id,
                version: version
            });
            conceptTo.parents.push(
            {
                conceptId: conceptFrom.id,
                version: version
            });
        }
        // Resolve object to concept relations.
        for (i = 0; i < input.concepts.length; i++)
        {
            inputConcept = input.concepts[i];
            for (var j = 0; j < inputConcept.objects.length; j++)
            {
                var inputObjectLink = inputConcept.objects[j];
                object = lattice.objects[inputObjectLink.object];
                concept = lattice.concepts[inputConcept.id];
                if (!object) console.error("Object " + inputObjectLink.object + "doesn't exist");
                if (!concept) console.error("Concept " + inputObjectLink.concept + "doesn't exist");
                var objectEdge = {
                    objectId: object.id,
                    conceptId: concept.id,
                    weights:
                    {},
                    version: version
                };
                objectEdge.weights[version] = inputObjectLink.weight;
                concept.objects.push(objectEdge);
                var conceptEdge = {
                    conceptId: concept.id,
                    weights:
                    {},
                    version: version
                };
                conceptEdge.weights[version] = inputObjectLink.weight;
                object.concepts.push(conceptEdge);
            }
        }
        return lattice;
    }
    /**
     * Combines two lattice objects into one preserving version information.
     * LatticeA objects is modified.
     */
    function addLatticeBtoLatticeA(latticeA, latticeB)
    {
        var i, conceptId, conceptA, conceptB, objectA, objectB, childA, copy;
        // First, merge all objects from A and B.
        for (var objectId in latticeB.objects)
        {
            objectB = latticeB.objects[objectId];
            // Check, if A has this object.
            if (latticeA.objects.hasOwnProperty(objectId))
            {
                // It has, update the version.
                objectA = latticeA.objects[objectId];
                objectA.version = objectA.version | objectB.version;
            }
            else
            {
                // It doesn't have, copy it over.
                copy = clone(objectB);
                // Remove all the edges, they will be merged separately.
                copy.concepts = [];
                latticeA.objects[objectId] = copy;
            }
        }
        // Then, merge all concepts from A and B.
        for (conceptId in latticeB.concepts)
        {
            conceptB = latticeB.concepts[conceptId];
            // Check if A has this concept already.
            if (latticeA.concepts.hasOwnProperty(conceptId))
            {
                // It has, update the version.
                conceptA = latticeA.concepts[conceptId];
                conceptA.version = conceptA.version | conceptB.version;
            }
            else
            {
                // A doesn't have the concept, copy it over.
                copy = clone(conceptB);
                // Remove all the edges, they will be merged separately.
                copy.parents = [];
                copy.children = [];
                copy.objects = [];
                latticeA.concepts[conceptId] = copy;
            }
        }
        // Merge all object edges from B and A.
        for (conceptId in latticeB.concepts)
        {
            conceptB = latticeB.concepts[conceptId];
            conceptA = latticeA.concepts[conceptId];
            for (i = 0; i < conceptB.objects.length; i++)
            {
                var objectEdgeB = conceptB.objects[i];
                objectB = latticeB.objects[objectEdgeB.objectId];
                // Get the object itself, it has to exist, since we merged them already.
                objectA = latticeA.objects[objectEdgeB.objectId];
                // The corresponding object-to-concept edge that is stored in the object.
                var conceptEdgeB = objectB.concepts.find(function(el)
                {
                    return el.conceptId === conceptB.id;
                });
                var objectEdgeA = conceptA.objects.find(function(el)
                {
                    return el.objectId === objectEdgeB.objectId;
                });
                if (objectEdgeA)
                {
                    var conceptEdgeA = objectA.concepts.find(function(el)
                    {
                        return el.conceptId === conceptA.id;
                    });
                    // Update the version.
                    objectEdgeA.version = objectEdgeA.version | objectEdgeB.version;
                    conceptEdgeA.version = conceptEdgeA.version | conceptEdgeB.version;
                    // Merge the version-weight information.
                    for (var version in objectEdgeB.weights)
                    {
                        objectEdgeA.weights[version] = objectEdgeB.weights[version];
                        conceptEdgeA.weights[version] = conceptEdgeB.weights[version];
                    }
                }
                else
                {
                    conceptA.objects.push(objectEdgeB);
                    objectA.concepts.push(conceptEdgeB);
                }
            }
        }
        // Next, merge all edges from B and A.
        for (conceptId in latticeB.concepts)
        {
            conceptB = latticeB.concepts[conceptId];
            conceptA = latticeA.concepts[conceptId];
            // Compare all the outgoing edges.
            for (i = 0; i < conceptB.children.length; i++)
            {
                var childEdgeB = conceptB.children[i];
                // Find the corresponding edge in A.
                var childEdgeA = conceptA.children.find(function(el)
                {
                    return el.conceptId === childEdgeB.conceptId;
                });
                if (childEdgeA)
                {
                    // The edge is present in A, just update its version and
                    // version of the 'parent' back edge.
                    childA = latticeA.concepts[childEdgeA.conceptId];
                    var parentEdgeA = childA.parents.find(function(el)
                    {
                        return el.conceptId === conceptA.id;
                    });
                    childEdgeA.version = childEdgeA.version | childEdgeB.version;
                    parentEdgeA.version = childEdgeA.version | childEdgeB.version;
                }
                else
                {
                    // The edge is not present, create it and a corresponding 'parent' back edge.
                    conceptA.children.push(childEdgeB);
                    childA = latticeA.concepts[childEdgeB.conceptId];
                    childA.parents.push(
                    {
                        conceptId: conceptA.id,
                        version: childEdgeB.version
                    });
                }
            }
        }
    }
    /**
     * Finds all the concept-to-concept edges in the lattice (including transitive)
     * and saves them for future use.
     */
    function computeTransitiveRelations(lattice)
    {
        var conceptList = d3.values(lattice.concepts);
        for (var i = 0; i < conceptList.length; i++)
        {
            var concept = conceptList[i];
            concept.childrenTransitive = [];
            concept.parentsTransitive = [];
        }
        for (i = 0; i < conceptList.length; i++)
        {
            var conceptA = conceptList[i];
            for (var j = 0; j < conceptList.length; j++)
            {
                if (i == j) continue;
                var conceptB = conceptList[j];
                if (isSubset(conceptA.intent, conceptB.intent))
                {
                    conceptA.childrenTransitive.push(
                    {
                        conceptId: conceptB.id,
                        version: 0
                    });
                    conceptB.parentsTransitive.push(
                    {
                        conceptId: conceptA.id,
                        version: 0
                    });
                }
            }
        }
    }
    /**
     * Computes layout and adds the resulting data to the lattice.
     */
    function computeLatticeLayout(lattice)
    {
        var i, concept, conceptId;
        // Segregate concepts according to their layers.
        var layers = {};
        for (conceptId in lattice.concepts)
        {
            concept = lattice.concepts[conceptId];
            if (!layers[concept.layer])
            {
                layers[concept.layer] = [];
            }
            // Create temporary adjacency lists, so that the originals won't be altered.
            concept.childrenFiltered = [];
            concept.parentsFiltered = [];
            concept.isDummy = false;
            layers[concept.layer].push(concept);
        }
        var dummyConceptCounter = 0;
        // Remove edges that cross multiple layers by introducing intermediate dummy concepts.
        for (conceptId in lattice.concepts)
        {
            concept = lattice.concepts[conceptId];
            for (i = 0; i < concept.children.length; i++)
            {
                var edge = concept.children[i];
                var child = lattice.concepts[edge.conceptId];
                edge.dummies = [];
                var layerDelta = child.layer - concept.layer;
                if (layerDelta == 1)
                {
                    edge.isMultilayer = false;
                    // One layer edge, copy it over unchanged.
                    concept.childrenFiltered.push(child);
                    child.parentsFiltered.push(concept);
                }
                else
                {
                    edge.isMultilayer = true;
                    // The edge crosses multiple layers, introduce dummy nodes.
                    var previousConcept = concept;
                    // Walk the layers, creating a dummy node at each of them.
                    for (var currentLayerIndex = concept.layer + 1; currentLayerIndex < concept.layer + layerDelta; currentLayerIndex++)
                    // for (var currentlayerIndexinLayersArray =0; currentlayerIndexinLayersArray< Object.keys(layers).length; currentlayerIndexinLayersArray++ )
                    {
                        //a quick fix
                        // var currentLayerIndex = Object.keys(layers)[currentlayerIndexinLayersArray];
                        var dummyConcept = {
                            id: hash("dummy" + dummyConceptCounter++),
                            intent: [],
                            version: concept.children[i].version,
                            isDummy: true,
                            layer: currentLayerIndex,
                            parentsFiltered: [previousConcept],
                            childrenFiltered: [],
                            objects: [],
                            children: []
                        };
                        lattice.concepts[dummyConcept.id] = dummyConcept;
                        edge.dummies.push(dummyConcept.id);
                        previousConcept.childrenFiltered.push(dummyConcept);
                        // console.log(currentLayerIndex, layers);
                        if (!layers[currentLayerIndex])
                        {
                            layers[currentLayerIndex] = [];
                        }
                        layers[currentLayerIndex].push(dummyConcept);
                        previousConcept = dummyConcept;
                    }
                    // Connect the last dummy node.
                    previousConcept.childrenFiltered.push(child);
                    child.parentsFiltered.push(previousConcept);
                }
            }
        }
        var stringToInt = function(el)
        {
            return parseInt(el);
        };
        var minLayerIndex = d3.min(d3.keys(layers).map(stringToInt));
        var maxLayerIndex = d3.max(d3.keys(layers).map(stringToInt));
        var sweepCounter = 0;
        var increment = -1;
        var currentLayerIndex = minLayerIndex;
        // Initialize positions of the first layer (based on their order in the array).
        for (i = 0; i < layers[currentLayerIndex].length; i++)
        {
            concept = layers[currentLayerIndex][i];
            concept.order = i + 1;
        }
        // Compute node ordering.
        // Perform sweeps back and forth through the graph,
        // rearranging the nodes. (Barycentric method)
        while (++sweepCounter <= 20)
        {
            increment = -increment;
            currentLayerIndex += increment;
            if (!layers.hasOwnProperty(currentLayerIndex))
            {
                continue;
            }
            // Perform one sweep up or down.
            var stopSweep = false;
            while (!stopSweep)
            {
                // Update order of each node in the layer.
                for (i = 0; i < layers[currentLayerIndex].length; i++)
                {
                    concept = layers[currentLayerIndex][i];
                    var neighbors = increment === 1 ? concept.parentsFiltered : concept.childrenFiltered;
                    // Save the previous order value, which is used as a secondary sorting criteria.
                    concept.oldOrder = concept.order;
                    // Calculate an average neighbor order for each concept in the layer.
                    if (neighbors.length > 0)
                    {
                        var neighborPositionSum = neighbors.reduce(function(current, neighbor)
                        {
                            return current + neighbor.order;
                        }, 0);
                        concept.order = neighborPositionSum / neighbors.length;
                    }
                    else
                    {
                        // Let unconnected nodes always be on the right.
                        concept.order = Number.MAX_VALUE;
                    }
                }
                // Sort concepts in the layer according to their newly computed order.
                layers[currentLayerIndex].sort(function(conceptA, conceptB)
                {
                    if (conceptA.order < conceptB.order) return -1;
                    else if (conceptA.order == conceptB.order)
                    {
                        if (conceptA.oldOrder < conceptB.oldOrder)
                        {
                            return -1;
                        }
                        else if (conceptA.oldOrder == conceptB.oldOrder)
                        {
                            return 0;
                        }
                        else
                        {
                            return 1;
                        }
                    }
                    else return 1;
                });
                // Assign order values according to the order of the concepts.
                for (i = 0; i < layers[currentLayerIndex].length; i++)
                {
                    concept = layers[currentLayerIndex][i];
                    concept.order = i + 1;
                }
                if (currentLayerIndex > minLayerIndex && currentLayerIndex < maxLayerIndex) currentLayerIndex += increment;
                else stopSweep = true;
            }
        }
        // Compute actual node positions.
        var conceptWidthFull = visParams.conceptWidth + visParams.conceptMargin * 2;
        var dummyWidthFull = visParams.dummyWidth + visParams.dummyMargin * 2;
        // Initialize positions considering node width.
        var widestLayerWidth = 0;
        var widestLayerIndex = 0;
        for (currentLayerIndex in layers)
        {
            var currentLayer = layers[currentLayerIndex];
            var currentPosition = 0;
            for (i = 0; i < currentLayer.length; i++)
            {
                concept = currentLayer[i];
                if (concept.isDummy)
                {
                    concept.position = currentPosition;
                    currentPosition += dummyWidthFull;
                }
                else
                {
                    concept.position = currentPosition;
                    currentPosition += conceptWidthFull;
                }
            }
            if (currentPosition > widestLayerWidth)
            {
                widestLayerWidth = currentPosition;
                widestLayerIndex = parseInt(currentLayerIndex);
            }
        }
        // Perform a sweep up from the widest layer.
        performSweep(widestLayerIndex, 1);
        // Perform a sweep down from the widest layer.
        performSweep(widestLayerIndex, -1);
        // An ad-hoc algorithm is used.
        // We walk right-to-left in the layer, adding more and more nodes to the 'current node group'.
        // If at any point there are more nodes that want to shift to the right than nodes that don't,
        // we perform a shift. Shift distance is determined by the smallest shift desired by a node in the group
        // and is also limited by the amount of whitespace available on the right.
        // This operation is performed multiple times on a layer, trying to reach a local minimum.
        function performSweep(widestLayerIndex, increment)
        {
            currentLayerIndex = widestLayerIndex;
            while (currentLayerIndex <= maxLayerIndex && currentLayerIndex >= minLayerIndex)
            {
                currentLayerIndex += increment;
                currentLayer = layers[currentLayerIndex];
                if (!currentLayer || currentLayer.length == 0) continue;
                sweepCounter = 0;
                while (sweepCounter++ < 10)
                {
                    var voteBalance = 0;
                    var maxShift = Number.MAX_VALUE;
                    var currentNodeGroup = [];
                    var whitespaceBeforeLastNode;
                    var whitespaceAvailableForShift;
                    for (var conceptIndex = currentLayer.length - 1; conceptIndex >= 0; conceptIndex--)
                    {
                        concept = currentLayer[conceptIndex];
                        var nodeWidth = concept.isDummy ? dummyWidthFull : conceptWidthFull;
                        if (conceptIndex === currentLayer.length - 1) whitespaceBeforeLastNode = widestLayerWidth - (concept.position + nodeWidth);
                        else whitespaceBeforeLastNode = currentLayer[conceptIndex + 1].position - concept.position - nodeWidth;
                        if (currentNodeGroup.length == 0)
                        {
                            // We've started a new group, update the whitespace available for it.
                            whitespaceAvailableForShift = whitespaceBeforeLastNode;
                        }
                        else if (whitespaceBeforeLastNode > 0.01)
                        {
                            // We've encountered some whitespace in the layer, node group ends here, start a new one.
                            currentNodeGroup = [];
                            voteBalance = 0;
                            maxShift = Number.MAX_VALUE;
                            whitespaceAvailableForShift = whitespaceBeforeLastNode;
                        }
                        currentNodeGroup.push(concept);
                        neighbors = increment > 0 ? concept.parentsFiltered : concept.childrenFiltered;
                        var idealNodePosition = neighbors.reduce(function(result, node)
                        {
                            return result + node.position;
                        }, 0) / neighbors.length;
                        // If dummy is connected to a single concept, align try to align it to the center of that concept.
                        if (concept.isDummy && neighbors.length == 1 && !neighbors[0].isDummy) idealNodePosition += (conceptWidthFull - dummyWidthFull) / 2;
                        if (neighbors.length === 0) idealNodePosition = concept.position + whitespaceAvailableForShift;
                        if (concept.position < idealNodePosition)
                        {
                            voteBalance++;
                            maxShift = Math.min(maxShift, idealNodePosition - concept.position);
                        }
                        else if (concept.position > idealNodePosition) voteBalance--;
                        if (voteBalance > 0)
                        {
                            // Current node group wants to shift, do it and reset everything.
                            var shift = Math.min(maxShift, whitespaceAvailableForShift);
                            currentNodeGroup.forEach(function(c)
                            {
                                return c.position += shift;
                            });
                            currentNodeGroup = [];
                            voteBalance = 0;
                            maxShift = Number.MAX_VALUE;
                            continue;
                        }
                        // Group doesn't want to shift, continue adding nodes to see if this changes.
                    }
                }
            }
        }
        calculateHighestLevelofObjects(lattice);
    }

    function calculateHighestLevelofObjects(lattice)
    {
        var objects = lattice.objects;
        var concepts = lattice.concepts;
        for (var objectIdKey in objects)
        {
            // var highestLayerNum=-1;
            // var highestLayerInVersion = -1;
            var highestLayerInfo = {};
            var weightsInVersions={};
            var aggregateLatticeHighestLayerNumber = -1;
            // var tempDict = {
            //         version: highestLayerNum
            //     }
            if (objects.hasOwnProperty(objectIdKey))
            {
                var tempConcepts = objects[objectIdKey].concepts;
                for (var index in tempConcepts)
                {
                    var tempConceptId = tempConcepts[index].conceptId;
                    var weightsDict = tempConcepts[index].weights;
                    var tempLayerNum = concepts[tempConceptId].layer;
                    aggregateLatticeHighestLayerNumber = tempLayerNum > aggregateLatticeHighestLayerNumber ? tempLayerNum : aggregateLatticeHighestLayerNumber;
                    for (var versionNumber in weightsDict)
                    {
                        if (highestLayerInfo.hasOwnProperty(versionNumber))
                        {
                            if (highestLayerInfo[versionNumber] < tempLayerNum) highestLayerInfo[versionNumber] = tempLayerNum;
                        }
                        else
                        {
                            highestLayerInfo[versionNumber] = tempLayerNum;
                        }

                        if (weightsInVersions.hasOwnProperty(versionNumber))
                        {
                            if (weightsInVersions[versionNumber] < weightsDict[versionNumber]) weightsInVersions[versionNumber] = weightsDict[versionNumber];
                        }
                        else
                        {
                            weightsInVersions[versionNumber] = weightsDict[versionNumber];
                        }

                    }
                }
            }
            lattice.objects[objectIdKey].highestLayerInfo = highestLayerInfo;
            lattice.objects[objectIdKey].weightsInVersions = weightsInVersions;
            lattice.objects[objectIdKey].highestLayerNumberInAggregateLattice = aggregateLatticeHighestLayerNumber;
        }
    }
    /////////////////// Main interface construction ///////////////////
    /**
     * Constructs the navigation block. The callback is called whenever
     * the user tries to navigate to a different visualization.
     */
    function constructNavigation(lattice, versions, versionLabels, navigateCallback)
    {
        // Create navigation containers.
        // var navigationContainer = d3.select("#navigation");
        var navigationContainer = d3.select("#diffPreviewContainerRow");
        var diffPreviewsContainer = navigationContainer.append("div").attr("id", "diffPreviewContainer").attr("class", "navigationRow");
        var versionPreviewsContainer = d3.select("#individualVersionRow").append("div").attr("class", "navigationRow");
        // Create the selection bar.
        // var selectionBarContainer = navigationContainer.append("div").attr("id", "selectionBar");
        var selectionBarContainer = d3.select("#selectionBar");
        var selectionBar = constructSelectionBar(selectionBarContainer, versions, versionLabels, function(selectedVersions)
        {
            // If user selects nothing, navigate to aggregation of all versions.
            if (selectedVersions.length > 0) navigateCallback(selectedVersions, "aggregate");
            else navigateCallback(versions, "aggregate")
        });
        // Handle arrow keys navigation.
        var navigateNext = null;
        var navigatePrev = null;
        document.onkeypress = function(e)
        {
            if ((e.keyCode == '39' || e.charCode == '100') && navigateNext != null) navigateNext();
            else if ((e.keyCode == '37' || e.charCode == '97') && navigatePrev != null) navigatePrev();
        };
        document.onkeydown = function(e)
        {
            if ((e.keyCode == '39' || e.charCode == '100') && navigateNext != null) navigateNext();
            else if ((e.keyCode == '37' || e.charCode == '97') && navigatePrev != null) navigatePrev();
        };
        // When changing current visualization also update the selection.
        var navigateCallbackWrapper = function(versionsChoice, type)
        {

            selectionBar.setSelectionToVersions(versionsChoice);
            // Update arrow key handlers.
            navigateNext = null;
            navigatePrev = null;
            if (type == "diff")
            {
                var i = versions.indexOf(versionsChoice[0]);
                if (i < versions.length - 2)
                {
                    navigateNext = function()
                    {
                        navigateCallbackWrapper([versions[i + 1], versions[i + 2]], "diff");
                    };
                }
                if (i > 0)
                {
                    navigatePrev = function()
                    {
                        navigateCallbackWrapper([versions[i - 1], versions[i]], "diff");
                    };
                }
            }
            else if (type == "aggregate" && versionsChoice.length == 1)
            {
                i = versions.indexOf(versionsChoice[0]);
                if (i < versions.length - 1)
                {
                    navigateNext = function()
                    {
                        navigateCallbackWrapper([versions[i + 1]], "aggregate");
                    };
                }
                if (i > 0)
                {
                    navigatePrev = function()
                    {
                        navigateCallbackWrapper([versions[i - 1]], "aggregate");
                    };
                }
            }
            if(type!="ctrl")
            navigateCallback(versionsChoice, type);
        };
        // Create the 'Aggregate all' button.
        d3.select("#buttonPanel").append("input").attr(
        {
            value: "Aggregate all timestamps",
            type: "button"
        }).on("click", function(e)
        {
            navigateCallbackWrapper(versions, "aggregate");
            var aggregateString = "Aggregated view of all timestamps";
            d3.select("#svgTextConsole").text(aggregateString);
        });
        // By default, select all versions on the bar.
        selectionBar.setSelectionToVersions(versions);
        // Create a 'version' and a 'diff' preview for each version.
        for (var i = 0; i < versions.length; i++)
        {
            var version = versions[i];
            var versionPreviewCanvas = versionPreviewsContainer.append("div").classed("svgContainer preview", true).append("svg");
            constructVisualization(
            {
                lattice: lattice,
                versions: [version],
                svgCanvas: versionPreviewCanvas,
                width: guiParams.previewWidth,
                height: guiParams.previewHeight,
                type: "aggregate",
                isPreview: true
            });
            // Change main visualization when clicked.
            versionPreviewCanvas.on("click", (function(versionsLocal)
            {
                // return function(e)
                // {
                //     navigateCallbackWrapper(versionsLocal, "aggregate");
                // };

                 return function(e)
                {

                    if(d3.event.ctrlKey)
                    {
                        if(window.count==0)
                        {
                            window.count=1;
                            window.diffVersionArray=versionsLocal.slice();
                            navigateCallbackWrapper(diffVersionArray, "ctrl");

                            
                        }
                        else if(window.count ==1)
                        {
                            window.count=0;
                            window.diffVersionArray.push(versionsLocal[0]);
                            diffVersionArray.sort(function(a, b){return a - b});
                            // destroyhighlightSelectedPreviewForDiff(diffVersionArray[0]);
                            
                            navigateCallbackWrapper(diffVersionArray, "diff");

                        }

                        
                        // console.log(diffVersionArray);
                    }
                    else 
                        navigateCallbackWrapper(versionsLocal, "aggregate");
                };

            })([version]));
            // Create a 'diff' preview.
            if (i < versions.length - 1)
            {
                var nextVersion = versions[i + 1];
                var diffPreviewCanvas = diffPreviewsContainer.append("div").classed("svgContainer preview", true).append("svg");
                constructVisualization(
                {
                    lattice: lattice,
                    versions: [version, nextVersion],
                    svgCanvas: diffPreviewCanvas,
                    width: guiParams.previewWidth,
                    height: guiParams.previewHeight,
                    type: "diff",
                    isPreview: true
                });
                diffPreviewCanvas.on("click", (function(versionsLocal)
                {
                    return function(e)
                    {
                        navigateCallbackWrapper(versionsLocal, "diff");
                    };
                })([version, nextVersion]));
            }
        }
    }

    function constructSelectionBar(container, versions, versionLabels, selectionUpdatedCallback)
    {
        // Width of a single preview chart, including margins.
        var fullPreviewWidth = guiParams.previewWidth + (guiParams.previewMargin + guiParams.previewBorder) * 2;
        var versionToLabel = function(version)
        {
            return Math.round(Math.log(version) / Math.log(2)) + 1;
        };
        // Create SVG canvas to draw the widget.
        var svgCanvas = container.append("svg").attr(
        {
            width: fullPreviewWidth * versions.length,
            height: guiParams.selectionBarHeight,
            version: 1.1,
            xmlns: "http://www.w3.org/2000/svg"
        });
        var versionCoords = [];
        // Create a text label for each version. Save their coords for future interaction.
        for (var i = 0; i < versions.length; i++)
        {
            var version = versions[i];
            var coords = {
                x: fullPreviewWidth * (i + 0.5),
                y: guiParams.selectionBarHeight / 2
            };
            versionCoords.push(coords);
            svgCanvas.append("text").attr(
            {
                x: coords.x,
                y: coords.y,
                "text-anchor": "middle",
                "dominant-baseline": "central" // Align text vertically.
                // }).text(versionLabels[i].length > 10 ? versionLabels[i].substr(0, 10) + "..." : versionLabels[i]);
                //PersonA
            }).text(versionLabels[i].length > 10 ? versionLabels[i].replace(".csv", "") + "" : versionLabels[i].replace(".csv", ""));
        }
        var isDragging = false;
        var startPoint = {
            x: 0,
            y: 0
        };
        // Current visual parameters of the selection.
        var selectionRect = null;
        var highlightRect = null;
        var selectionRect2 = null;
        var selectionRectX = 0;
        var selectionRectX2 = 0;
        var selectionRectWidth = 0;
        var selectionRectWidth2 = 0;
        // Helper function to transform coords from screen space to SVG space.
        var point = svgCanvas.node().createSVGPoint();

        function getSvgCoords(event)
        {
            point.x = event.clientX;
            point.y = event.clientY;
            return point.matrixTransform(svgCanvas.node().getScreenCTM().inverse());
        }
        //PersonA-adding for drag behavior
        // var drag = d3.behavior.drag()
        //             .origin(function(d) { return {x: d[0], y: d[1]}; })
        //             .on("drag", dragged);
        // function dragged(e) 
        // {
        //     var currentPoint = getSvgCoords(e);
        //     var delta = currentPoint.x - startPoint.x;
        //     // In SVG rect's width must be positive, so handle two cases.
        //     if (delta >= 0) {
        //         moveSelectionRect(startPoint.x, delta);
        //     } else {
        //         moveSelectionRect(startPoint.x + delta, -delta);
        //     }
        // }
        //svgCanvas.node().addEventListener("call", drag);
        // -----Person A modification ends-----
        // Original code
        svgCanvas.node().addEventListener("mousedown", handleMouseDown);
        svgCanvas.node().addEventListener("mousemove", handleMouseMove);
        // // Subscribe to the global event, in case mouse button is lifted outside the SVG container.
        document.addEventListener("mouseup", handleMouseUp);
        // Start the selection interaction when mouse is pressed.
        function handleMouseDown(e)
        {
            e.preventDefault();
            isDragging = true;
            startPoint = getSvgCoords(e);
            moveSelectionRect(startPoint.x, 1);
        }
        // Update the selection rectangle position when user drags the mouse.
        function handleMouseMove(e)
        {
            if (!isDragging) return;
            var currentPoint = getSvgCoords(e);
            var delta = currentPoint.x - startPoint.x;
            // In SVG rect's width must be positive, so handle two cases.
            if (delta >= 0)
            {
                moveSelectionRect(startPoint.x, delta);
            }
            else
            {
                moveSelectionRect(startPoint.x + delta, -delta);
            }
        }
        // Align the selection rectangle when the gesture is finished.
        function handleMouseUp(e)
        {
            if (!isDragging) return;
            isDragging = false;
            window.selectedVersions = [];
            for (var i = 0; i < versionCoords.length; i++)
            {
                var coords = versionCoords[i];
                // If selection rectangle overlaps version rectangle ...
                if (coords.x + (fullPreviewWidth / 2) >= selectionRectX && coords.x - (fullPreviewWidth / 2) <= (selectionRectX + selectionRectWidth))
                {
                    // ... version gets selected.
                    window.selectedVersions.push(versions[i]);
                }
            }
            setSelectionToVersions(selectedVersions);
            // Notify subscribers about the selection change.
            if (selectedVersions.length > 0) selectionUpdatedCallback(selectedVersions);
            else selectionUpdatedCallback([]);
        }

        function highlightSelectedPreviewForDiff(version)
        {
            if (highlightRect === null)
            {
                // selectionRect = svgCanvas.append("rect");
                highlightRect = svgCanvas.insert("rect", "text");
                highlightRect.attr(
                {
                    y: 1,
                    height: guiParams.selectionBarHeight - 1,
                    "stroke-width": 1,
                    "stroke":"black",
                    // fill: "#58b6fc",
                    fill: visParams.highlightColor,
                    opacity: "0.4"
                });
            }
            var leftIndex = versions.indexOf(version);
                // Get coords of the selected versions.
            var leftCoords = versionCoords[leftIndex];
            var x1 = leftCoords.x - fullPreviewWidth / 2;

            // highlightRect = x1;
            highlightRect.attr(
            {
                x: x1,
                width: fullPreviewWidth
            });
        }

        function destroyhighlightSelectedPreviewForDiff(version)
        {
            if(highlightRect)
            {
                highlightRect.remove();
                highlightRect=null;
            }
            
        }

        // Update the current position of the selection rect.
        function moveSelectionRect(x, width)
        {


            // Create the selection rect if it doesn't exist already.
            if (selectionRect === null)
            {
                // selectionRect = svgCanvas.append("rect");
                selectionRect = svgCanvas.insert("rect", "text");
                selectionRect.attr(
                {
                    y: 1,
                    height: guiParams.selectionBarHeight - 1,
                    "stroke-width": 0,
                    // fill: "#58b6fc",
                    fill: visParams.highlightColor,
                    opacity: "1.0"
                });
            }
            selectionRectX = x;
            selectionRectWidth = width;
            selectionRect.attr(
            {
                x: x,
                width: width
            });
        }

        function moveSelectionRectDiff(x1, x2)
        {
            // Create the selection rect if it doesn't exist already.
            if (selectionRect === null)
            {
                // selectionRect = svgCanvas.append("rect");
                selectionRect = svgCanvas.insert("rect", "text");
                selectionRect.attr(
                {
                    y: 1,
                    height: guiParams.selectionBarHeight - 1,
                    "stroke-width": 0,
                    // fill: "#58b6fc",
                    fill: visParams.highlightColor,
                    opacity: "1.0"
                });
            }
            selectionRectX = x1;
            selectionRectWidth = fullPreviewWidth;
            selectionRect.attr(
            {
                x: x1,
                width: fullPreviewWidth
            });

             if (selectionRect2 === null)
            {
                // selectionRect = svgCanvas.append("rect");
                selectionRect2 = svgCanvas.insert("rect", "text");
                selectionRect2.attr(
                {
                    y: 1,
                    height: guiParams.selectionBarHeight - 1,
                    "stroke-width": 0,
                    // fill: "#58b6fc",
                    fill: visParams.highlightColor,
                    opacity: "1.0"
                });
            }
            selectionRectX2 = x2;
            selectionRectWidth2 = fullPreviewWidth;
            selectionRect2.attr(
            {
                x: x2,
                width: fullPreviewWidth
            });
        }
        // Update the current selection to cover the specified versions.
        function setSelectionToVersions(selectedVersions)
        {
            // PersonA- code to show different selection views in label text
            // var aggregateString = "Aggregated view of all timestamps";
            window.selectedVersions = selectedVersions;
            var diffString = "";
            var individualVersionString = "";
            var labelContainer = d3.select("#svgTextConsole");
            if(window.count!=1)
            {

                if (selectedVersions.length == 1)
                {
                    if (!(filenames === undefined))
                    {
                        individualVersionString = "Timestamp " + filenames[versions.indexOf(selectedVersions[0])].replace(".csv", "");
                    }
                    labelContainer.text(individualVersionString);
                }

                else if (selectedVersions.length == 2)
                {
                    if (!(filenames === undefined)) 
                    {
                        diffString1 = "Diff view between timestamps " + filenames[versions.indexOf(selectedVersions[0])].replace(".csv", "");
                        diffString2 = " and " + filenames[versions.indexOf(selectedVersions[1])].replace(".csv", "")
                    }
                    // labelContainer.text(diffString);
                    labelContainer.selectAll("*").remove();
                    labelContainer.text("");
                    labelContainer.append("label").text(diffString1);
                    labelContainer.append("label").text(" (");
                    labelContainer.append("svg").attr("width",50).attr("height",20).append("path").attr("stroke-dasharray", visParams.diffStrokeA).attr("stroke", "black").attr("d","M0 10 l215 0").attr("stroke-width", 2);
                    labelContainer.append("label").text(") ");

                    labelContainer.append("label").text(diffString2);
                    labelContainer.append("label").text(" (");
                    labelContainer.append("svg").attr("width",50).attr("height",20).append("path").attr("stroke-dasharray", visParams.diffStrokeB).attr("stroke", "black").attr("d","M0 10 l215 0").attr("stroke-width", 2);
                    labelContainer.append("label").text(") ");
                    
                }
                else
                {
                    labelContainer.text("");
                }
            }

            destroyhighlightSelectedPreviewForDiff(selectedVersions[0]);

            if (selectedVersions.length > 0 && selectedVersions.length !=2 && window.count!=1)
            {
                // Indices of the first and the last selected versions.
                var leftIndex = versions.indexOf(selectedVersions[0]);
                var rightIndex = versions.indexOf(selectedVersions[selectedVersions.length - 1]);
                // Get coords of the selected versions.
                var leftCoords = versionCoords[leftIndex];
                var rightCoords = versionCoords[rightIndex];
                var x = leftCoords.x - fullPreviewWidth / 2;
                var width = rightCoords.x + fullPreviewWidth / 2 - x;
                moveSelectionRect(x, width);
                if(selectionRect2)
                {
                   selectionRect2.remove();
                    selectionRect2 = null; 
                }
                
            }
            else if (window.count==1 && selectedVersions.length==1)
            {
                highlightSelectedPreviewForDiff(selectedVersions[0]);

            }
            else if (selectedVersions.length ==2)
            {
                var leftIndex = versions.indexOf(selectedVersions[0]);
                var rightIndex = versions.indexOf(selectedVersions[selectedVersions.length - 1]);
                // Get coords of the selected versions.
                var leftCoords = versionCoords[leftIndex];
                var rightCoords = versionCoords[rightIndex];
                var x1 = leftCoords.x - fullPreviewWidth / 2;
                var x2 = rightCoords.x - fullPreviewWidth / 2;

                // var width = rightCoords.x + fullPreviewWidth / 2 - x;
                moveSelectionRectDiff(x1, x2);
            }
            else
            {
                if(selectionRect)
                {
                    selectionRect.remove();
                    selectionRect = null;    
                }

                if(selectionRect2)
                {
                    selectionRect2.remove();
                    selectionRect2 = null;
                }

            }
        }
        return {
            setSelectionToVersions: setSelectionToVersions
        };
    }
    /**
     * Constructs a single visualization view.
     * Used for both the main visualization and the previews.
     */
     function drawBarChart(params, visualization)
     {
        tempData = params.lattice.stats[params.versions[0]];
        var width = visualization.fieldOfView.width;
        height = visualization.fieldOfView.height;
        // var height = (guiParams.previewHeight*width)/guiParams.previewWidth;
        // width = d3.select("#mainVisualization svg").attr("width") ;
        // height = d3.select("#mainVisualization svg").attr("height");
        var x1 = visualization.fieldOfView.x;
        var y1 = visualization.fieldOfView.y;
        var x2 = visualization.fieldOfView.x + width;
        var y2 = visualization.fieldOfView.x + height;


        

        // console.log(visualization.fieldOfView.x, visualization.fieldOfView.y, width, height, visualization.fieldOfView.height);
        // var x = d3.scaleBand().rangeRound([0, params.width]).padding(0.1);
        var allObjects = Object.keys(params.lattice.objects);

        tempData.push({name: "total", count: allObjects.length })
        var namesArray=[];
        for(var item in tempData)
        {
            namesArray.push(tempData[item].name);
        }
        var x = d3.scale.ordinal()
                          // .domain(allConceptNames)
                          .domain(namesArray)
                          .rangeRoundBands([0, width], 0.1);
                          // .range([0, width]);

        var y = d3.scale.linear().range([height , 0]);


        var allObjectsFiltered = [];
        objectsDict = params.lattice.objects;
        for(var key in objectsDict)
        {
            if(objectsDict[key].version & params.versions[0])
                allObjectsFiltered.push(objectsDict[key]);
        }
        // y.domain([0, allObjectsFiltered.length]);
        y.domain([0, allObjects.length]);

        // var g = params.svgCanvas.append("g");


        // g.selectAll(".bar")
        //     .data(tempData)
        //     .enter().append("rect")
        //       .attr("class", "bar")
        //       .attr("x", function(d) { return x(d.name); })
        //       .attr("y", function(d) { return y(d.count); })
        //       .attr("fill", function(d)
        //       {
        //         var color = colors_g[allConceptNames.indexOf(d.name)];
        //         // console.log(color);
        //         return color;
        //       })
        //       .attr("opacity", visParams.previewBarOpacity)
        //       .attr("width", x.rangeBand())
        //       .attr("height", function(d) { return height - y(d.count); })
        //       .attr("transform", "scale("+1+","+(guiParams.previewWidth/guiParams.previewHeight)+  ")" + " translate("+x1+","+(y1)+  ")");


     }
    function constructVisualization(params)
    {
        var visualization = initVisualization(params.svgCanvas, params.type, !params.isPreview, !params.isPreview);
        params.svgCanvas.attr(
        {
            width: params.width,
            height: params.height
        });
        render(params.lattice, params.versions, visualization, true, true);
        if(params.versions.length ==1)
            drawBarChart(params, visualization);
        return visualization;
    }
    /////////////////// Visualization initialization & basic interaction ///////////////////
    /**
     * Creates a visualization object which describes parameters of the visualization
     * and its location in the DOM.
     */
    function initVisualization(svgCanvas, type, isInteractive, hasLabels)
    {
        visualization = {};
        visualization.type = type; // 'normal' or 'aggregate'
        visualization.isInteractive = isInteractive;
        visualization.hasLabels = hasLabels;
        // Set SVG canvas properties.
        visualization.svgCanvas = svgCanvas;
        visualization.svgCanvas.attr("version", 1.1).attr("xmlns", "http://www.w3.org/2000/svg");
        // Create an SVG-group to act as an outer-most container.
        visualization.root = visualization.svgCanvas.append("g").attr("id", "root");
        // Create groups that would act as layers.
        visualization.root.append("g").classed("layerSeparators", true);
        visualization.root.append("g").classed("labelSeparators", true);
        visualization.root.append("g").classed("edges", true);
        visualization.root.append("g").classed("selectedEdges", true);
        visualization.root.append("g").classed("concepts", true);
        visualization.root.append("g").classed("legend", true);
        // var legendSVG = d3.select("#mainVisualization").append("svg");
        // legendSVG = legendSVG.attr("position", "absolute").attr("id", "legendSVG");
        // legendSVG.append("g").classed("legend", true);
        // Define reused elements.
        visualization.defs = visualization.svgCanvas.append("defs");
        visualization.defs.append("marker").attr(
        {
            id: "arrow-marker",
            viewBox: "0 0 5 2",
            markerWidth: 5,
            markerHeight: 3,
            refX: 5,
            refY: 1,
            orient: "auto"
        }).append("path").attr(
        {
            d: "M0,0 L0,2 L5,1 L0,0",
            fill: "black"
        });
        // Gradient for the 'object diff edge'.
        var gradient = visualization.defs.append("linearGradient").attr(
        {
            id: "objectDiffEdgeGradient",
            x1: "0%",
            x2: "100%",
            y1: "0%",
            y2: "0%"
        });
        var colorA = hexToRgb(visParams.diffColorA);
        var colorB = hexToRgb(visParams.diffColorB);
        gradient.append("stop").attr(
        {
            offset: "0%",
            style: "stop-color:rgb(" + colorA.r + "," + colorA.g + "," + colorA.b + ")"
        });
        gradient.append("stop").attr(
        {
            offset: "60%",
            style: "stop-color:rgb(" + colorB.r + "," + colorB.g + "," + colorB.b + ")"
        });
        // Prepare for interactions.
        visualization.fieldOfView = {
            x: 0,
            y: 0,
            width: 1000, // Reasonable default values that would be overridden during the first render.
            height: 1000,
            zoom: 1
        };
        updateSvgViewBox(visualization);
        visualization.isSelectionActive = false;
        visualization.focusedObject = null;
        if (visualization.isInteractive)
        {
            enableZooming(visualization);
            enablePanning(visualization);
        }
        return visualization;
    }
    /**
     * Enables panning feature for the visualization object.
     */
    function enablePanning(visualization)
    {
        var isDragging = false;
        var lastPoint = {
            x: 0,
            y: 0
        };
        var svgCanvasNode = visualization.svgCanvas.node();
        svgCanvasNode.addEventListener("mousedown", function(e)
        {
            e.preventDefault();
            beingDragged = false;
            isDragging = true;
            lastPoint.x = e.pageX;
            lastPoint.y = e.pageY;
        });
        svgCanvasNode.addEventListener("mousemove", function(e)
        {
            // d3.event.preventDefault();
            if (isDragging)
            {
                var delta = {
                    x: e.pageX - lastPoint.x,
                    y: e.pageY - lastPoint.y
                };
                beingDragged = true;
                lastPoint.x = e.pageX;
                lastPoint.y = e.pageY;
                var canvasWidth = visualization.svgCanvas.attr("width");
                var canvasHeight = visualization.svgCanvas.attr("height");
                // Figure out the scaling to compute the shift in visualization coords.
                // (mouse moves in screen coords)
                var scale = {
                    x: canvasWidth / visualization.fieldOfView.width,
                    y: canvasHeight / visualization.fieldOfView.height
                };
                // The actual scaling preserves aspect ratio.
                var actualScale = Math.min(scale.x, scale.y);
                visualization.fieldOfView.x -= delta.x / actualScale;
                visualization.fieldOfView.y -= delta.y / actualScale;
                updateSvgViewBox(visualization);
            }
        });
        // Subscribe to the global event, in case mouse button is lifted outside the SVG container.
        document.addEventListener("mouseup", function(e)
        {
            if (beingDragged) handleClick = false
            isDragging = false;
            handleClick = true;
        });
    }
    /**
     * Enables zooming feature for the visualization object.
     */
    function enableZooming(visualization)
    {
        var wheelHandlerWrapper = function(e)
        {
            mouseWheelHandler(e, visualization);
        };
        // IE9, Chrome, Safari, Opera
        visualization.svgCanvas.node().addEventListener("mousewheel", wheelHandlerWrapper, false);
        // Firefox
        visualization.svgCanvas.node().addEventListener("wheel", wheelHandlerWrapper, false);

        function mouseWheelHandler(e, visualization)
        {
            // Cross-browser wheel delta calculation. (FF and Chrome tested)
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.deltaY)));
            e.preventDefault();
            var svgRect = visualization.svgCanvas.node().getBoundingClientRect();
            var svgOffset = {
                x: svgRect.left + window.scrollX,
                y: svgRect.top + window.scrollY
            };
            var canvasWidth = visualization.svgCanvas.attr("width");
            var canvasHeight = visualization.svgCanvas.attr("height");
            var mouseCoords = {
                x: clamp((e.pageX - svgOffset.x) / canvasWidth, 0, 1),
                y: clamp((e.pageY - svgOffset.y) / canvasHeight, 0, 1)
            };
            var oldWidth = visualization.fieldOfView.width;
            var oldHeight = visualization.fieldOfView.height;
            var oldZoom = visualization.fieldOfView.zoom;
            var newWidth = delta > 0 ? oldWidth / visParams.zoomStep : oldWidth * visParams.zoomStep;
            var newHeight = delta > 0 ? oldHeight / visParams.zoomStep : oldHeight * visParams.zoomStep;
            var newZoom = delta > 0 ? oldZoom * visParams.zoomStep : oldZoom / visParams.zoomStep;
            if (newZoom < visParams.minZoom || newZoom > visParams.maxZoom)
            {
                return;
            }
            var shiftX = (oldWidth - newWidth) / 2;
            var shiftY = (oldHeight - newHeight) / 2;
            visualization.fieldOfView.x += oldWidth * mouseCoords.x - newWidth * mouseCoords.x;
            visualization.fieldOfView.y += oldHeight * mouseCoords.y - newHeight * mouseCoords.y;
            visualization.fieldOfView.width = newWidth;
            visualization.fieldOfView.height = newHeight;
            visualization.fieldOfView.zoom = newZoom;
            updateSvgViewBox(visualization);

            function clamp(x, min, max)
            {
                return Math.min(max, Math.max(min, x));
            }
        }
    }

    function updateSvgViewBox(visualization)
    {
         visualization.svgCanvas.attr("viewBox", visualization.fieldOfView.x + " " + visualization.fieldOfView.y + " " + visualization.fieldOfView.width + " " + visualization.fieldOfView.height);
         // d3.select("#legendSVG").attr("viewBox", visualization.fieldOfView.x + " " + visualization.fieldOfView.y + " " + visualization.fieldOfView.width + " " + visualization.fieldOfView.height);
        // visualization.svgCanvas.attr("viewBox", visualization.fieldOfView.x + " " + visualization.fieldOfView.y + " " + visualization.fieldOfView.width + " " + visualization.fieldOfView.height)
        //                         .attr("preserveAspectRatio","xMinYMax meet");
    }
    /////////////////// Visualization rendering & direct interaction ///////////////////
    /**
     * The main rendering function which is called whenever a visualization needs to be updated.
     */

     function computeStats(lattice, version)
     {
        var conceptsInCurrentVersion =[];
        var allConceptNamesIdsDict={};

        var conceptArray=Object.values(lattice.concepts);
        var conceptArrayFiltered=[];

        for(var i=0; i<conceptArray.length; i++)
        {
            if((conceptArray[i].version & version)>0)
            {
                conceptArrayFiltered.push(conceptArray[i]);
            }
        }

        for(var i=0; i<conceptArrayFiltered.length;i++)
        {
            // if(allConceptNames.indexOf(conceptArray[i].fullName)>=0)
            {
                if(!(conceptArrayFiltered[i].fullName in allConceptNamesIdsDict))
                {
                    allConceptNamesIdsDict[conceptArrayFiltered[i].fullName] = {id:conceptArrayFiltered[i].id, count: conceptArrayFiltered[i].objectsFiltered.length};
                }
                else
                {
                    allConceptNamesIdsDict[conceptArrayFiltered[i].fullName].count += conceptArray[i].objectsFiltered.length;
                }
            }
        }
        allConceptNamesIdsDictFiltered = {};

        keysArray = Object.keys(allConceptNamesIdsDict);
        for(var i=0; i<keysArray.length; i++)
        {
            var temp = keysArray[i].split(", ");
            if(temp.length==1)
            {
                allConceptNamesIdsDictFiltered[keysArray[i]] = allConceptNamesIdsDict[keysArray[i]];
            }
        }

        var jsonArray=[];
        for(var i=0; i<allConceptNames.length; i++)
        {
            var tempDict={};
            if(allConceptNames[i] in allConceptNamesIdsDictFiltered)
            {
                tempDict.name = allConceptNames[i];
                tempDict.count = allConceptNamesIdsDictFiltered[allConceptNames[i]].count;
            }
            else
            {
                tempDict.name = allConceptNames[i];
                tempDict.count = 0;
            }
            jsonArray.push(tempDict);
        }
        if (!("stats" in lattice))
        {
            lattice.stats={};
        }

        if(!(version in lattice.stats))
        {
            lattice.stats[version] = jsonArray;
        }

        
    
     }

    function render(lattice, versions, visualization, isFirstRender, shouldAdjustFov)
    {
        /////////////////////// Definitions ///////////////////////
        var versionA = null;
        var versionB = null;
        var versionAggregated = null;
        var versionFilter = null;
        var versionToColor = null;
        var rerender = function()
        {
            render(lattice, versions, visualization, false, false);
        };
        var colorMappingDiff = function(version)
        {
            if ((version & (versionA | versionB)) === (versionA | versionB)) return visParams.diffColorAB;
            if ((version & versionA) > 0) return visParams.diffColorA;
            return visParams.diffColorB;
        };
        var colorMappingAggregate = function(version)
        {
            var grayValue = (1 - frequencyFromVersion(version));
            grayValue = Math.floor(grayValue * 255);
            return "rgb(" + grayValue + "," + grayValue + "," + grayValue + ")";
        };
        var versionFilterDiff = function(version)
        {
            return ((version & versionA) > 0) || ((version & versionB) > 0);
        };
        var versionFilterAggregate = function(version)
        {
            return (versionAggregated & version) > 0;
        };

        // renderList(lattice, versions);

        function frequencyFromVersion(version)
        {
            var count = 0;
            for (var i = 0; i < versions.length; i++)
            {
                var possibleVersion = versions[i];
                if ((version & possibleVersion) > 0) count++;
            }
            return count / versions.length;
        }
        /////////////////////// Interpret arguments ///////////////////////
        if (visualization.type == "diff")
        {
            versionA = versions[0];
            versionB = versions.length > 1 ? versions[1] : versionA;
            versionFilter = versionFilterDiff;
            versionToColor = colorMappingDiff;
        }
        else if (visualization.type == "aggregate")
        {
            // Compute bit-OR of all the versions.
            versionAggregated = versions.reduce(function(result, element)
            {
                return result | element;
            }, 0);
            versionFilter = versionFilterAggregate;
            versionToColor = colorMappingAggregate;
        }
        else
        {
            throw new Error("Invalid visualization type");
        }

        computeNodeFilteringMetric(lattice, versions);

        ///////////////// Computing visual attributes /////////////////
        // Construct list of concepts that need to be rendered.
        var conceptList = compileConceptList(lattice, versionFilter);
        // Construct list of edges that need to be rendered.
        var conceptEdgeList = compileConceptEdgeList(lattice, conceptList, versionFilter);
        if(versions.length==1)
            computeStats(lattice, versions);

        // Compute visual attributes of the concepts.
        var layerHeights = {};
        computeConceptVisualsAndLayerHeights(visualization, lattice, conceptList, versionFilter, layerHeights);
        if (isFirstRender)
        // if (true)
        {

             var bbox = {
                x1: Number.MAX_VALUE,
                y1: Number.MAX_VALUE,
                x2: -Number.MAX_VALUE,
                y2: -Number.MAX_VALUE
            };
            conceptListtemp=Object.values(lattice.concepts);
            for (var i = 0; i < conceptListtemp.length; i++)
            {
                var concept = conceptListtemp[i];
                bbox.x1 = concept.x < bbox.x1 ? concept.x : bbox.x1;
                bbox.y1 = concept.y < bbox.y1 ? concept.y : bbox.y1;
                bbox.x2 = (concept.x + concept.width) > bbox.x2 ? (concept.x + concept.width) : bbox.x2;
                bbox.y2 = (concept.y + concept.height) > bbox.y2 ? (concept.y + concept.height) : bbox.y2;
            }
            visualization.bbox = bbox;

            // Clear the canvas.
            visualization.root.selectAll("g").selectAll("*").remove();
            var sizeLegendSvg=d3.select("g .legend");
            // var sizeLegendSvg=d3.select("#legendSVG g.legend");
            // legendwidth=60;
            sizeLegendSvg.attr("height", "20px");
            
            
            // sizeLegendSvg.append('rect')
            // .attr("x", )
            // .attr('width',legendwidth)
            // .attr('height',"40px")
            // .attr('fill', "none")
            // .attr('stroke', "black")
            // .attr('stroke-width', "2px");


            if (visualization.type == "diff")
            {
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "-5px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Size (Object):");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius = Math.sqrt(objectSizeScale[2]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,10)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius = Math.sqrt(objectSizeScale[2]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,10)");

                // sizeLegendSvg.append('circle')
                //     .attr('r', Math.sqrt(objectSizeScale[2]/Math.PI))
                //     .attr('cx', "0px")
                //     .attr('cy', "10px");
                var a = filenames[versions.indexOf(window.selectedVersions[0])];
                // console.log(filenames[versions.indexOf(window.selectedVersions[0])]);

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "15px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius = Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,30)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius = Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,30)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "35px"})
                .attr("font-size", "10px")
                .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0]))/2.0).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }
                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,55)");
                 sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius =  Math.sqrt(objectSizeScale[3]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }
                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,55)");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "60px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[1]).toFixed(2));

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "85px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Position:");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,100)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "105px"})
                .attr("font-size", "10px")
                .text('Object in ' +""+ filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "")+"" );

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,120)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "125px"})
                .attr("font-size", "10px")
                .text('Object in ' + ""+ filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") +"");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,140)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,140)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "145px"})
                .attr("font-size", "10px")
                .text('Object in both ');
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "156px"})
                .attr("font-size", "10px")
                .text(  ""+filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "")+""  +" and "+""+filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") +"");

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 300, 350)
                    },

                    "stroke": function(d)
                    {
                        return "black";
                    },
                    // "stroke":"black",
                    "fill": "none",
                    "fill-opacity": 0
                }).attr("transform", "translate(0,175)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }
                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,175)");
                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "175px"})
                .attr("font-size", "10px")
                .text('Highest intersection level');
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "190px"})
                .attr("font-size", "10px")
                .text('for the object in '+"" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") +"");

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "205px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","1 1")
                    .attr("transform", "translate(-5,225)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","1 1")
                    .attr("transform", "translate(-5,235)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "241px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text('Set/Edge only in '+"" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") +"");


                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,255)");

                    sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,265)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "271px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text('Set/Edge only in '+"" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") +"");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,285)");

                    sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,295)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "295px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text('Set/Edge in both');
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "310px"})
                .attr("font-size", "10px")
                .text(filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + " and "+
                 filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", ""));


                

                var bbox = sizeLegendSvg.node().getBBox();

                var rect = sizeLegendSvg.append("rect")
                    .attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 5)
                    .attr("rx", "10px")
                    .attr("ry", "10px")
                    .attr("width", bbox.width + 2*5)
                    .attr("height", bbox.height + 2*5)
                    .style("fill", "#f4f4f4")
                    .style("fill-opacity", "1")
                    .style("stroke", "black")
                    .style("stroke-width", "1px");
                    
                 visParams.legendBoundingBox = bbox;

                // sizeLegendSvg.attr("transform", "translate("+ (visualization.bbox.x2 + 30)+","+(visualization.bbox.y2 - bbox.height +10) + ")");
                sizeLegendSvg.attr("transform", "translate("+ (visualization.bbox.x1 -200 )+","+(visualization.bbox.y1 ) + ")");
                
                // sizeLegendSvg.attr("transform", "translate("+ (40)+","+30 + ")");


                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "-5px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Size (Object):");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius = Math.sqrt(objectSizeScale[2]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,10)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius = Math.sqrt(objectSizeScale[2]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,10)");

                // sizeLegendSvg.append('circle')
                //     .attr('r', Math.sqrt(objectSizeScale[2]/Math.PI))
                //     .attr('cx', "0px")
                //     .attr('cy', "10px");
                var a = filenames[versions.indexOf(window.selectedVersions[0])];
                // console.log(filenames[versions.indexOf(window.selectedVersions[0])]);

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "15px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius = Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,30)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius = Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,30)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "35px"})
                .attr("font-size", "10px")
                .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0]))/2.0).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }
                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,55)");
                 sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius =  Math.sqrt(objectSizeScale[3]/Math.PI);
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }
                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,55)");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "60px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[1]).toFixed(2));

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "85px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Position:");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,100)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "105px"})
                .attr("font-size", "10px")
                .text('Object in ' +""+ filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "")+"" );

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,120)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "125px"})
                .attr("font-size", "10px")
                .text('Object in ' + ""+ filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") +"");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,140)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =1;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    }

                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,140)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "145px"})
                .attr("font-size", "10px")
                .text('Object in both ');
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "160px"})
                .attr("font-size", "10px")
                .text(  ""+filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "")+""  +" and "+""+filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") +"");

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 300, 350)
                    },

                    "stroke": function(d)
                    {
                        return "black";
                    },
                    // "stroke":"black",
                    "fill": "none",
                    "fill-opacity": 0
                }).attr("transform", "translate(0,175)");
                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag =0;
                    var radius =  Math.sqrt(objectSizeScale[3]/(2*Math.PI));
                    if (0 ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }
                    return path;
                }).attr("fill", "black").attr(
                {
                    "stroke-width": 0
                }).attr("transform", "translate(0,175)");
                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "175px"})
                .attr("font-size", "10px")
                .text('Highest intersection level');
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "190px"})
                .attr("font-size", "10px")
                .text('for the object in '+"" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") +"");

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "210px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","1 1")
                    .attr("transform", "translate(-5,225)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","1 1")
                    .attr("transform", "translate(-5,235)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "241px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text('Set/Edge only in '+"" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") +"");


                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,255)");

                    sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,265)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "271px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text('Set/Edge only in '+"" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") +"");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,285)");

                    sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width","2px")
                    .attr("stroke","black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,295)");
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "295px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text('Set/Edge in both');
                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "310px"})
                .attr("font-size", "10px")
                .text(filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + " and "+
                 filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", ""));
                // sizeLegendSvg.append("path").attr(
                // {
                //     d: function()
                //     {
                //         return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 10, 60)
                //     },

                //     "stroke": function(d)
                //     {
                //         return "black";
                //     },
                //     // "stroke":"black",
                //     "fill": "none",
                //     "fill-opacity": 0
                // }).attr("transform", "translate(0,105)");

                

                // sizeLegendSvg.append('text')
                // .attr("dx", function(d){return "20px"})
                // .attr("dy", function(d){return "115px"})
                // .attr("font-size", "10px")
                // .text('Topmost');

                // sizeLegendSvg.append('text')
                // .attr("dx", function(d){return "20px"})
                // .attr("dy", function(d){return "115px"})
                // .attr("font-size", "10px")
                // .text('occurrence');
                

            }

            else if (visualization.type == "aggregate")
            {
                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "-5px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Size (Object):");

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[2]/Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "10px");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "15px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3]/(2*Math.PI)) )
                    .attr('cx', "0px")
                    .attr('cy', "30px");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "35px"})
                .attr("font-size", "10px")
                .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0]))/2.0).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3]/Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "50px");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "55px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[1]).toFixed(2));

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 300, 60)
                    },

                    "stroke": function(d)
                    {
                        return "black";
                    },
                    // "stroke":"black",
                    "fill": "none",
                    "fill-opacity": 0
                });
                arc.attr("transform", "translate(0,75)");
                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3]/(2*Math.PI)) )
                    .attr('cx', "0px")
                    .attr('cy', "75px");

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "75px"})
                .attr("font-size", "10px")
                .text('Highest intersection level');

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "85px"})
                .attr("font-size", "10px")
                .text('for the object');

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "105px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "10px").attr("height", "10px")
                    .attr("rx", "2px")
                    .attr("ry", "2px")
                    .attr("fill", "#1a8e6a")
                    .attr("strike-width","0px")
                    .attr("transform", "translate(0,115)");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "125px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Base set");



                


                var bbox = sizeLegendSvg.node().getBBox();

                var rect = sizeLegendSvg.append("rect")
                    .attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 5)
                    .attr("rx", "10px")
                    .attr("ry", "10px")
                    .attr("width", bbox.width + 2*5)
                    .attr("height", bbox.height + 2*5)
                    .style("fill", "#f4f4f4")
                    .style("fill-opacity", "1")
                    .style("stroke", "black")
                    .style("stroke-width", "1px");
                    
                 visParams.legendBoundingBox = bbox;

                 // sizeLegendSvg.attr("transform", "translate("+ (0)+","+(bbox.y1-10) + ")");
                // sizeLegendSvg.attr("transform", "translate("+ (bbox.x1)+","+(bbox.y1-10) + ")");
                // sizeLegendSvg.attr("transform", "translate("+ (visualization.bbox.x2 + 30)+","+(visualization.bbox.y2 - bbox.height +10) + ")");
                sizeLegendSvg.attr("transform", "translate("+ (visualization.bbox.x1 -200 )+","+(visualization.bbox.y1 ) + ")");

                // sizeLegendSvg.attr("transform", "translate("+ (40)+","+30 + ")");

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "-5px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Size (Object):");

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[2]/Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "10px");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "15px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3]/(2*Math.PI)) )
                    .attr('cx', "0px")
                    .attr('cy', "30px");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "35px"})
                .attr("font-size", "10px")
                .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0]))/2.0).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3]/Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "50px");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "55px"})
                .attr("font-size", "10px")
                .text(parseFloat(objectSizeScale[1]).toFixed(2));

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 300, 60)
                    },

                    "stroke": function(d)
                    {
                        return "black";
                    },
                    // "stroke":"black",
                    "fill": "none",
                    "fill-opacity": 0
                });
                arc.attr("transform", "translate(0,75)");
                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3]/(2*Math.PI)) )
                    .attr('cx', "0px")
                    .attr('cy', "75px");

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "75px"})
                .attr("font-size", "10px")
                .text('Highest intersection level');

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "90px"})
                .attr("font-size", "10px")
                .text('for the object');

                 sizeLegendSvg.append('text')
                .attr("dx", function(d){return "-5px"})
                .attr("dy", function(d){return "105px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "10px").attr("height", "10px")
                    .attr("rx", "2px")
                    .attr("ry", "2px")
                    .attr("fill", "#1a8e6a")
                    .attr("strike-width","0px")
                    .attr("transform", "translate(0,115)");

                sizeLegendSvg.append('text')
                .attr("dx", function(d){return "20px"})
                .attr("dy", function(d){return "125px"})
                .attr("font-size", "10px")
                // .attr("font-weight", "bold")
                .text("Base set");
                
            }
           

        }
        if (shouldAdjustFov)
        {
            // Use all lattice concepts for computation, so that mental map would be preserved.
            centerFieldOfView(d3.values(lattice.concepts), visualization);
        }
        // Handle the selection.
        var selectedConcepts = [];
        var selectedObjectEdges = [];


        addSelectionInformationAndFindSelectedObjects(visualization, conceptList, conceptEdgeList, selectedConcepts, selectedObjectEdges);
        // Compute extra edges between the selected concepts. (the dashed edges)
        addExtraEdgesToEdgeList(selectedConcepts, conceptEdgeList);
        // Compute layer separator visual attributes.
        var separatorList = computeLayerSeparatorVisuals(visualization, layerHeights);
        var labelSeparators = labelSeparatorVisuals(visualization, layerHeights, separatorList);
        ///////////////// Rendering /////////////////
        // Keep all D3 selections in an object.
        var selections = {
            separatorUpdate: null,
            notSelectedEdgeUpdate: null,
            selectedEdgeUpdate: null,
            conceptCreate: null,
            conceptUpdate: null,
            objectCreate: null,
            objectUpdate: null,
            objectDiffEdgeUpdate: null
        };
        // Create a container for layer separators.
        var separatorContainer = visualization.root.select("g.layerSeparators");
        // Render layer separators.
        selections.separatorUpdate = separatorContainer.selectAll("line").data(separatorList);
        selections.separatorUpdate.enter().append("line");
        selections.separatorUpdate.attr(
        {
            x1: -10000,
            x2: +10000
        }).attr("y1", function(d)
        {
            return d.y;
        }).attr("y2", function(d)
        {
            return d.y;
        }).attr(
        {
            stroke: "grey",
            "stroke-width": 1,
            "stroke-dasharray": "10, 10"
        });

         var separatorContainer = visualization.root.select("g.labelSeparators");
        // Render layer separators.
        selections.separatorUpdate = separatorContainer.selectAll("text").data(labelSeparators);
        selections.separatorUpdate.enter().append("text");
        selections.separatorUpdate.attr("text-anchor", "left")
        .attr(
        {
            // x: visualization.bbox.x1 - 170
            x:(visualization.bbox.x1 + visualization.bbox.x2)/2 + 300/2 + 180
        })
        // .attr("x", function(d){
        //     return d.x + 2000;
        // })
        .attr("y", function(d)
        {
            return d.y + d.height/2 + visParams.layerLabelFontSize/2;
        }).attr(
        {
            fill: "#ccc"
        }).text(function(d){
            return d.num ;
        }).attr("font-size", "20px")
        .attr("opacity", 1);


        // Create edges between the concepts.
        var notSelectedEdges = conceptEdgeList.filter(function(e)
        {
            return !e.isSelected;
        });
        var selectedEdges = conceptEdgeList.filter(function(e)
        {
            return e.isSelected;
        });
        var edgeKeyFunction = function(d)
        {
            return d.from.id + "to" + d.to.id;
        };
        // Render non-selected edges below the concepts.
        selections.notSelectedEdgeUpdate = visualization.root.select("g.edges").selectAll("path.conceptEdge").data(notSelectedEdges, edgeKeyFunction);
        renderEdges(selections.notSelectedEdgeUpdate);
        // Render selected edges on top of concepts.
        selections.selectedEdgeUpdate = visualization.root.select("g.selectedEdges").selectAll("path.conceptEdge").data(selectedEdges, edgeKeyFunction);
        renderEdges(selections.selectedEdgeUpdate);

        function renderEdges(selection, className)
        {
            selection.enter().append("path").classed("conceptEdge", true).attr("d", function(d)
            {
                return constructConceptEdgePathString(d);
            }).attr(
            {
                fill: "none",
                "stroke-width": 2
            });
            selection.exit().remove();
            selection.attr("stroke", function(d)
            {
                if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                return versionToColor(d.version);
            }).attr("stroke-opacity", function(d)
            {
                // return (!visualization.isSelectionActive || d.isSelected) ? 1 : visParams.outOfFocusOpacity;
                return (d.isSelected) ? 1 : visParams.outOfFocusEdgesOpacity;
            }).attr("stroke-dasharray", function(d)
            {
                if(d.isExtra)
                {
                    return "20, 10";
                }
                else if(visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected)
                {
                        return "";
                } 
                else
                {
                    if((d.version & (versionA | versionB)) === (versionA | versionB))
                    {
                        //If present in both versions
                        return visParams.diffStrokeAB;
                    }
                    // If present only in version A
                    else if ((d.version & versionA) > 0) 
                        return visParams.diffStrokeA;
                    
                    // If present only in version B
                    else
                        return visParams.diffStrokeB;
                }
                    
            });
        }
        // Render concepts.
        selections.conceptUpdate = visualization.root.select("g.concepts").selectAll("g.concept").data(conceptList.filter(function(c)
        {
            return !c.isDummy;
        }), function(d)
        {
            return d.id;
        });
        // Create an SVG-group for every new concept.
        selections.conceptCreate = selections.conceptUpdate.enter().append("g").classed("concept", true).attr("transform", function(d)
        {
            return "translate(" + d.x + " " + d.y + ")";
        });
        // Add an invisible hitbox which is slightly bigger than the concept rectangle.
        selections.conceptCreate.append("rect").attr(
        {
            x: -visParams.conceptMargin,
            y: -visParams.layerMargin / 2,
            "stroke-opacity": 0,
            "fill-opacity": 0
        }).attr("width", function(d)
        {
            return d.width + visParams.conceptMargin * 2;
        }).attr("height", function(d)
        {
            return d.height + visParams.layerMargin / 2;
        });
        // Create concept rectangles.
        selections.conceptCreate.append("rect").classed("concept", true).attr(
        {
            x: 0,
            y: 0
        }).attr("width", function(d)
        {
            return d.width;
        }).attr("height", function(d)
        {
            return d.height;
        }).attr(
        {
            fill: "white",
            "stroke-width": 3
        });

    //      selections.conceptCreate.each(function (d, i) {
    //         // console.log(d,i);
    //         var temp = d3.select(this).selectAll("g").data(d.intersections).enter().append("g");
 

    //         temp.each(function (d, i) {
    //             // console.log(d,i);
    //             d3.select(this)
    //             .append("rect")
    //             .classed("intersection", true)
    //             .attr(
    //             {
    //                 x: 15*i,
    //                 y: -25
    //             }).attr("width", function(d)
    //             {
    //                 return 10;
    //             }).attr("height", function(d)
    //             {
    //                 return 20;
    //             }).attr("fill", function(d)
    //             {
    //                 return d;
    //             });
    //         });
            
    // });
      

      


        // Update concept rectangles.
        selections.conceptUpdate.select("rect.concept").attr("stroke-opacity", function(d)
        {
            return (!visualization.isSelectionActive || d.isSelected) ? 1 : visParams.outOfFocusConceptOpacity;
        }).attr("stroke", function(d)
        {
            if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
            return versionToColor(d.version);
        }).attr("stroke-dasharray", function(d)
            {
                if(visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected)
                {
                        return "";
                } 
                else
                {
                    if((d.version & (versionA | versionB)) === (versionA | versionB))
                    {
                        //If present in both versions
                        return visParams.diffStrokeAB;
                    }
                    // If present only in version A
                    else if ((d.version & versionA) > 0) 
                        return visParams.diffStrokeA;
                    
                    // If present only in version B
                    else
                        return visParams.diffStrokeB;
                }
                    
            });

        // Create object circles.
        selections.objectUpdate = selections.conceptUpdate.selectAll("g.object");
        selections.objectCreate = selections.conceptCreate.selectAll("g.object").data(function(d)
        {
            // console.log(d.objectsFiltered);
            // function sortFunc(a, b) {
            //       // var sortingArr = [ 'b', 'c', 'b', 'b', 'c', 'd' ];
            //       return dataTableArray.indexOf(a.objectId) - dataTableArray.indexOf(b.objectId);
            //     }

            //     sortedFilteredObjects = d.objectsFiltered.sort(sortFunc);

            return d.objectsFiltered;
            // console.log(d.objectsFiltered, sortedFilteredObjects, dataTableArray);
            // return sortedFilteredObjects;

        })
        selections.objectCreate.exit().remove();
        selections.objectCreate = selections.objectCreate.enter().append("g").classed("object", true).attr("transform", function(d)
        {
            return "translate(" + d.x + "," + d.y + ")";
        });

        


        if (visualization.type == "diff")
        {
            appendObjectHalfcircles(selections.objectCreate, versionA);
            appendObjectHalfcircles(selections.objectCreate, versionB);
        }
        else if (visualization.type == "aggregate")
        {
            appendObjectCircles(selections.objectCreate);
        }
        else
        {
            throw new Error("Invalid visualization type");
        }
        /// Creates halfcircles corresponding to a particular version (A or B).
        function appendObjectHalfcircles(objectCreateSelection, version)
        {
            var sweepFlag = version === versionA ? 0 : 1;
            if(guiParams.shape ==="circle")
            {
                objectCreateSelection.filter(function(d)
                {
                    return (d.version & version) > 0 ? this : null;
                }).append("path").attr("d", function(d)
                {
                    var path = "";
                    var radius = d.radii[version];
                    if (sweepFlag ==0)
                    {
                        path += "M -0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    }
                    else
                    {
                        path += "M 0.25," + (-radius);
                        path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;

                    }
                    return path;
                }).attr("fill", versionToColor(version)).attr(
                {
                    "stroke-width": 0
                });
            }
            else
            {
                objectCreateSelection.filter(function(d)
                {
                    return (d.version & version) > 0 ? this : null;
                }).append("path").attr("d", function(d)
                {
                    var path = "";
                    var radius = d.radii[version];
                    var sweepdirection = sweepFlag==0?-1:1;
                    if(sweepFlag==0){
                        path+="M "+(-radius-1)+"," + (-radius)+" h "+ (sweepdirection*radius) +" v "+(visParams.objectMaxSize)+" h "+(-1*sweepdirection*radius)+" Z"
                    }
                    else{
                        path+="M "+(-radius+1)+"," + (-radius)+" h "+ (sweepdirection*radius) +" v "+(visParams.objectMaxSize)+" h "+(-1*sweepdirection*radius)+" Z"
                    }

                    // path += "M 0," + (-radius);
                    // path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0," + radius;
                    return path;
                }).attr("fill", function(d,i){
                    if(sweepFlag==0){
                        return "none";
                    }
                    else{
                        return "black";
                    }
                })
                .attr("stroke-width","1px")
                .attr("stroke","black");
            }

            objectCreateSelection.filter(function(d)
            {
                return (d.version & version) > 0 ? this : null;
            }).append("path").attr(
            {
                d: function()
                {
                    if (sweepFlag == 0)
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 300, 350)
                    }
                    else
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 10, 60)
                    }
                },
                // cx: 0,
                // cy: 0,
                // r: visParams.objectMaxSize / 2,
                "stroke": function(d)
                {
                    return versionToColor(version);
                },
                // "stroke":"black",
                "fill": "none",
                "fill-opacity": 0,
                "visibility": function(d)
                {
                    var getCurrentconceptId = d.conceptId;
                    var getCurrentObjectId = d.objectId;
                    var layerNumberOfConcept = lattice.concepts[getCurrentconceptId].layer;
                    if (typeof currentVersion != 'undefined')
                    {
                        var tempHighestLayerInAllVersions = -1;
                        for (var i in currentVersion)
                        {
                            if (lattice.objects[getCurrentObjectId].highestLayerInfo[currentVersion[i]] > tempHighestLayerInAllVersions) tempHighestLayerInAllVersions = lattice.objects[getCurrentObjectId].highestLayerInfo[currentVersion[i]];
                        }
                        if (lattice.objects[getCurrentObjectId].highestLayerInfo[version] == layerNumberOfConcept) return "visible"
                    }
                    return "hidden";
                }
            });
            return objectCreateSelection;
        }
        /// Creates circles that aggregate all the versions.
        function appendObjectCircles(objectCreateSelection)
        {
            if(guiParams.shape==="circle")
            {
                objectCreateSelection.append("circle").attr("r", function(d)
                {
                    // Average weight across versions where edge was present.
                    return Math.sqrt(d3.mean(d3.values(d.radii).map(function(r)
                    {
                        return Math.PI * r * r;
                    })) / Math.PI);
                }).attr("fill", function(d)
                {
                    return versionToColor(d.version);
                }).attr(
                {
                    "stroke-width": 0
                });
            }

            else
            {
                objectCreateSelection.append("rect").attr("width", function(d)
                {
                    // Average weight across versions where edge was present.
                    return Math.sqrt(d3.mean(d3.values(d.radii).map(function(r)
                    {
                        return r*visParams.objectMaxSize;
                    })) );
                }).attr("fill", function(d)
                {
                    return versionToColor(d.version);
                }).attr(
                {
                    "stroke-width": 0
                })
                .attr("height", visParams.objectMaxSize)
                .attr("x", -visParams.objectMaxSize / 2)
                .attr("y", -visParams.objectMaxSize / 2);
            }
                     

            objectCreateSelection.append("path").attr(
            {
                d: describeArc(0, 0, 1 + (visParams.objectMaxSize / 2), 300, 60),
                // cx: 0,
                // cy: 0,
                // r: visParams.objectMaxSize / 2,
                "stroke": function(d)
                {
                    return versionToColor(d.version);
                },
                // "stroke":"black",
                "fill": "none",
                "fill-opacity": 0,
                "visibility": function(d)
                {
                    var getCurrentconceptId = d.conceptId;
                    var getCurrentObjectId = d.objectId;
                    var layerNumberOfConcept = lattice.concepts[getCurrentconceptId].layer;
                    if (typeof currentVersion != 'undefined')
                    {
                        var tempHighestLayerInAllVersions = -1;
                        for (var i in currentVersion)
                        {
                            if (lattice.objects[getCurrentObjectId].highestLayerInfo[currentVersion[i]] > tempHighestLayerInAllVersions) tempHighestLayerInAllVersions = lattice.objects[getCurrentObjectId].highestLayerInfo[currentVersion[i]];
                        }
                        if (tempHighestLayerInAllVersions == layerNumberOfConcept) return "visible"
                    }
                    return "hidden";
                }
            });
        }
        // Update object-edges.
        selections.objectUpdate.select("circle").attr("fill", function(d)
        {
            // if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isFocused)
            //     return versionToColor(versionAggregated);
            return versionToColor(d.version);
        });
        selections.objectUpdate.selectAll("circle, path, line").attr("fill-opacity", function(d)
        {
            return (!visualization.isSelectionActive || d.isSelected) ? 1 : visParams.outOfFocusOpacity;
        }).attr("opacity", function(d)
        {
            return (!visualization.isSelectionActive || d.isSelected) ? 1 : visParams.outOfFocusOpacity;
        }).attr("stroke-opacity", function(d)
        {
            return (!visualization.isSelectionActive || d.isSelected) ? 1 : visParams.outOfFocusOpacity;
        });
        if (visualization.hasLabels)
        {
            // Create intent labels.
           var tempGroup= selections.conceptCreate.append("g").classed("intent", true)
           .attr("x", function(d)
            {
                return 0;
            }).attr("y", function(d)
            {
                return -visParams.layerMargin / 8;
            });

            // tempGroup.append("text").attr("x", function(d)
            // {
            //     return 0;
            // }).attr("y", function(d)
            // {
            //     return -visParams.layerMargin / 8;
            // }).attr("text-anchor", "middle").attr("font-size", visParams.intentLabelFontSize + "px");
            

            // Update intent labels.
            selections.conceptUpdate.select("g.intent").html(function(d)
            {
                // Split the name into multiple lines.
                // var name = d.isFocused || d.isSelected ? d.fullName : d.name;
                var name = d.fullName;
                var attributes = name.split(", ");
                var result = "";
                var text = this;
                var bBox = text.getBBox();
                attributes.sort(function(a, b){  
                      return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
                    });

                attributes.forEach(function(attr, index)
                {
                    var dy = index == 0 ? 0 : -visParams.intentLabelFontSize;
                    pos = allConceptNames.indexOf(attr);
                    // console.log(bBox.height);
                    {   var pad =2;
                        var labelPad= 1;
                        var conceptTopPad = 2;
                        fillColor = colors_g[pos];
                        
                        var conceptColoredBoxPad =  (visParams.conceptWidth  - (allConceptNames.length * ((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight))))/(allConceptNames.length+1) ;


                        var occupiedSpace = ((d.width / 2)-(visParams.conceptWidth/2) + allConceptNames.length * ((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptColoredBoxPad));
                        var freeSpace = visParams.conceptWidth - occupiedSpace;
                        var leftPaddingForCentering = freeSpace/2;
                        // result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(bBox.width/2)) + "\" y=\"" + (- (visParams.intentLabelFontSize+pad)*(index+1)) +"\" width=\""+ bBox.width+ "\" height=\"" + visParams.intentLabelFontSize + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        // result += "<rect class = \"textBackground\"  x=\"" + ( conceptColoredBoxPad + (d.width / 2)-(visParams.conceptWidth/2) + pos*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptColoredBoxPad)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) - conceptTopPad - (pad)) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        result += "<rect class = \"textBackground\"  x=\"" + ( conceptColoredBoxPad + (d.width / 2)-(visParams.conceptWidth/2) + pos*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptColoredBoxPad)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)-2 ) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" rx=\"5\"" +  "\" ry=\"5\"" + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        // result += "<rect class = \"textBackground\"  x=\"" + ( conceptColoredBoxPad + (d.width / 2)-(visParams.conceptWidth/2) + pos*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptColoredBoxPad)) + "\" y=\"" + (1 ) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" fill=\""+fillColor + "\" fill-opacity=\"" + 0.5+ "\">"  + "</rect>";

                        // if(d.name.length > 0)
                        // {

                        //     // result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(visParams.conceptWidth/2)) + "\" y=\"" + (- (visParams.intentLabelFontSize)*(index+1) - conceptTopPad - (index*pad)) +"\" width=\""+ visParams.conceptWidth+ "\" height=\"" + visParams.intentLabelFontSize + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        //     result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(visParams.conceptWidth/2) + pos*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptTopPad)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) - conceptTopPad - (pad)) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        // }

                        // else
                        //     // result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(visParams.conceptWidth/2)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelRectHeight)*(index+1) - conceptTopPad - (index*pad)) +"\" width=\""+ visParams.conceptWidth+ "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelRectHeight) + "\" fill=\""+fillColor +"\">"  + "</rect>";

                        // // TODO:
                        //  //  1. Ordering of colors
                        //  //  2. Check whether name bars could be present with these small bars or not
                        //     // result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(visParams.conceptWidth/2) + index*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptTopPad)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) - conceptTopPad - (pad)) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" fill=\""+fillColor +"\">"  + "</rect>";

                        //     result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(visParams.conceptWidth/2) + pos*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptTopPad)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) - conceptTopPad - (pad)) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" fill=\""+fillColor +"\">"  + "</rect>";

                        // result += "<tspan x=\"" + d.width / 2 + "\" dy=\"" + dy + "\">" + attr + "</tspan>";
                        var conceptLabelYPos = (- (visParams.intentLabelFontSize)*(index) - conceptTopPad) - (index*(pad+labelPad));
                        if (index==0)conceptLabelYPos = conceptLabelYPos-1;
                        // console.log(conceptLabelYPos);

                        // if(d.name.split(',').length ==1)
                        // if(d.name.length > 0)
                        // {
                        //     result += "<text x=\"" + (d.width / 2) + "\" y=\"" + conceptLabelYPos + "\" text-anchor= \"middle\" font-size=\"" +visParams.intentLabelFontSize  +"px \">" +attr;
                        //     result += "</text>";    
                        // }
                        // if(d.fullName.split(',').length ==1)
                        if(d.name.length > 0)   //Condition to check if it has either one name or more than one name due to subset relationsship

                        {
                            if(d.fullName.split(',').length ==1)    //Condition to check if it has only one name and no subset relationship
                            {

                                result += "<text x=\"" + (d.width / 2) + "\" y=\"" + (- (visParams.intentLabelFontSize)*(index+1) - conceptTopPad - (index*pad) - 6)   + "\" text-anchor= \"middle\" font-size=\"" +visParams.intentLabelFontSize  +"px \">" +attr;
                                result += "</text>";    
                            }
                            // else    //Condition to check if there is only subset relationship
                            // {

                            // }
                        }
                    }
                });
                return result;
            }).each(function(d, i)
            {
                // Render white background.
                // 'this' is set to the corresponding DOM element. (text node)
                // var text = this;
                // var bBox = text.getBBox();
                // var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                // var oldRect = text.parentNode.getElementsByClassName("textBackground")[0];
                // if (oldRect) text.parentNode.removeChild(oldRect);
                // text.parentNode.insertBefore(rect, text);
                // rect.setAttribute("class", "textBackground");
                // rect.setAttribute("x", bBox.x);
                // rect.setAttribute("y", bBox.y);
                // rect.setAttribute("width", bBox.width);
                // rect.setAttribute("height", bBox.height);
                // rect.setAttribute("fill", "white");
                // // rect.setAttribute("fill", "orange");
                // rect.setAttribute("fill-opacity", 0.5);
            }).attr("fill", function(d)
            {
                if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                return versionToColor(d.version);
            }).attr("fill-opacity", function(d)
            {
                return (!visualization.isSelectionActive || d.isSelected) ? 1 : visParams.outOfFocusConceptOpacity;
            });

            // Crate frequency labels.
            if (visualization.type == "aggregate")
            {
                selections.conceptCreate.append("text").text(function(d)
                {
                    if (versions.length == 1) return "";
                    else return (frequencyFromVersion(d.version) * 100).toFixed(0) + "%";
                }).classed("frequency", true).attr("x", function(d)
                {
                    return d.width / 2;
                }).attr("y", function(d)
                {
                    return d.height + 20;
                }).attr("text-anchor", "middle");
                selections.conceptUpdate.select("text.frequency").attr("fill", function(d)
                {
                    if (visualization.isSelectionActive && d.isSelected) return versionToColor(d.version);
                    return "white";
                }).attr("fill-opacity", function(d)
                {
                    return (visualization.isSelectionActive && d.isSelected) ? 1 : 0;
                });
            }
        }
        
        /////////////////////// Interactivity ///////////////////////
        // Check whether we should enable interaction.
        if (!visualization.isInteractive) return;
        // Should be filled in with information about the edge: source, target, coords, etc.
        // ObjectDiffEdge is also called a "transition edge".
        var objectDiffEdge = null;
        // Object diff edge only makes sense in a 'diff' visualization.
        if (visualization.type == "diff")
        {
            objectDiffEdge = computeObjectDiffEdgeVisuals(visualization, conceptList, selectedObjectEdges, versionA, versionB);
        }
        // Render the 'object diff edge'. (if it is needed)
        selections.objectDiffEdgeUpdate = visualization.root.selectAll("path.objectDiffEdge").data(objectDiffEdge != null ? [objectDiffEdge] : []);
        selections.objectDiffEdgeUpdate.enter().append("path").classed("objectDiffEdge", true);
        selections.objectDiffEdgeUpdate.exit().remove();
        selections.objectDiffEdgeUpdate.attr("d", function(d)
        {
            // Render the edge itself taking in account its length.
            var r = visParams.objectMaxSize / 2 + 3;
            var a = {
                x: 0,
                y: r
            };
            var b = {
                x: objectDiffEdge.length - r,
                y: 0
            };
            var c = {
                x: 0,
                y: -r
            };
            // Modifying for having an arrow head
            return "M" + a.x + "," + a.y + " L" + b.x + "," + b.y + " L" + (b.x - 9) + "," + (b.y - 5) + " L" + (b.x - 9) + "," + (b.y + 5) + " L" + b.x + "," + b.y + " L" + c.x + "," + c.y + " A" + r + "," + r + " 0 0,1 " + a.x + "," + a.y;
            //Original Code
            // return  "M" + a.x + "," + a.y +
            //         " L" + b.x + "," + b.y +
            //         " L" + c.x + "," + c.y +
            //         " A" + r + "," + r + " 0 0,1 " + a.x + "," + a.y;
        }).attr("transform", function(d)
        {
            // Rotate and position the edge on the visualization.
            var degrees = Math.atan2(d.deltaY, d.deltaX) / Math.PI * 180;
            var rotate = "rotate(" + degrees + ",0,0)";
            var translate = "translate(" + objectDiffEdge.fromX + "," + objectDiffEdge.fromY + ")";
            return translate + " " + rotate;
        }).attr(
        {
            stroke: 2,
            fill: "url(#objectDiffEdgeGradient)",
            style: "pointer-events: none;fill-opacity:"+visParams.diffEdgeFillOpacity

        });
        // Enable tooltips
        var tooltip = d3.tip().direction("s").attr("class", "d3-tip").html(function(d)
        {
            var weight = "";
            var name = lattice.objects[d.objectId].name;
            if (versions.length == 1)
            {
                var relevantWeights = d3.keys(d.weights).filter(versionFilter).map(function(v)
                {
                    return d.weights[v];
                });
                weight = "[" + d3.mean(relevantWeights).toFixed(2) + "]";
                weight = weight + " " + name;
            }
            else if (visualization.type == "aggregate")
            {
                var relevantWeights = d3.keys(d.weights).filter(versionFilter).map(function(v)
                {
                    return d.weights[v];
                });
                weight = "[avg:" + d3.mean(relevantWeights).toFixed(2) + "]";
                weight = weight + " " + name + " — " + (frequencyFromVersion(d.version) * 100).toFixed(0) + "%";
            }
            else if (visualization.type == "diff")
            {
                var colorA = versionToColor(versionA);
                var colorB = versionToColor(versionB);
                var weightA = d.weights[versionA] ? d.weights[versionA].toFixed(2) : "-";
                var weightB = d.weights[versionB] ? d.weights[versionB].toFixed(2) : "-";
                // weight = "[<span style='color: " + colorA + "'>" + weightA + "</span>/";
                // weight += "<span style='color: " + colorB + "'>" + weightB + "</span>]";
                weight = "["+weightA + "/";
                weight += + weightB + "]";
                weight = weight + " " + name;
            }
            else
            {
                throw new Error("Invalid visualiation type");
            }
            return weight;
        });
        visualization.svgCanvas.call(tooltip);
        // Register event handlers for direct interaction.
        // Schedulers are used to schedule and cancel callbacks,
        // which is necessary to prevent flickering of the visualization.
        // The flickering results from the fact that hovering over contained objects
        // triggers a mouseOut event for the container. We schedule a deselection,
        // but abort it if a contained object received a mouseover event meaning
        // that the mouse is still inside the container.
        var objectSelectionScheduler = new Scheduler(300);
        for (var i = 0; i < conceptList.length; i++)
        {
            conceptList[i].scheduler = new Scheduler(300);
        }
        selections.conceptCreate.on("mouseover", function(d)
        {
            d.scheduler.run(function()
            {
                visualization.isSelectionActive = true;
                visualization.focusedConcept = d;
                d.isFocused = true;
                // console.log(d);
                rerender();
            });
        }).on("mouseout", function(d)
        {
            if (objectSelectedInObjectListBoolean)
            {
                visualization.focusedObject = selectedObjectId;
                // mainVisualization.focusedObject = object.id;
                visualization.isSelectionActive = true;
                // render(lattice, currentVersion, visualization, false, true);
            }
            else
            {
                d.scheduler.run(function()
                {
                    visualization.isSelectionActive = false;
                    visualization.focusedConcept = null;
                    d.isFocused = false;
                    rerender();
                });
            }
        });
        /*
            to mark those objects in concepts, which are not present in higher concepts.

           To draw a upper curve (semi circle arc)

           */
        function polarToCartesian(centerX, centerY, radius, angleInDegrees)
        {
            var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        }

        function describeArc(x, y, radius, startAngle, endAngle)
        {
            if(guiParams.shape==="circle")
            {
                var start = polarToCartesian(x, y, radius, endAngle);
                var end = polarToCartesian(x, y, radius, startAngle);
                var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
                var d = ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
                return d;  
            }
            else if(guiParams.shape==="square")
            {
                var start = polarToCartesian(x, y, radius, endAngle);
                var end = polarToCartesian(x, y, radius, startAngle);
                var largeArcFlag = endAngle - startAngle <= 180 ? -1 : 1;
                var d = ["M", x+largeArcFlag, y, "h", largeArcFlag*visParams.objectMaxSize].join(" ");
                return d; 
            }
            
        }
        selections.objectCreate.append("rect").attr(
        {
            x: -visParams.objectMaxSize / 2,
            y: -visParams.objectMaxSize / 2,
            width: visParams.objectMaxSize,
            height: visParams.objectMaxSize,
            "visibility": "hidden",
            "pointer-events": "all"
        }).on("mouseover", function(d)
        {
            var e = d3.event;
            var objectEdge = d;
            var object = lattice.objects[objectEdge.objectId];
            var concept = lattice.concepts[objectEdge.conceptId];
            visualization.focusedObject = object.id;
            // Abort any handlers scheduled by the concept.
            concept.scheduler.stop();
            concept.isFocused = true;
            // Schedule an object selection.
            objectSelectionScheduler.run(function()
            {
                rerender();
                d3.event = e;
                tooltip.show(d);
            });
        }).on("click", function(d)
        {
            // var e = d3.event;
            d3.event.stopPropagation()
            var objectEdge = d;
            var object = lattice.objects[objectEdge.objectId];
            var concept = lattice.concepts[objectEdge.conceptId];
            visualization.focusedObject = object.id;
            selectedObjectId = visualization.focusedObject;
            visualization.isSelectionActive = true;
            objectSelectedInObjectListBoolean = true;
            dataTableObject.rows('.selected').nodes().to$() // Convert to a jQuery object
                .removeClass('selected');
            var tableRow = $("#listExample td").filter(function()
            {
                return $(this).text() == lattice.objects[object.id].name;
            }).closest("tr").addClass("selected");
            render(lattice, currentVersion, visualization, false, false);
            drawAuthorEvolution(object.id, object);
        }).on("mouseout", function(d)
        {
            var e = d3.event;
            if (objectSelectedInObjectListBoolean)
            {
                visualization.focusedObject = selectedObjectId;
                // mainVisualization.focusedObject = object.id;
                visualization.isSelectionActive = true;
                // render(lattice, currentVersion, visualization, false, true);
            }
            else
            {
                visualization.focusedObject = null;
                visualization.isSelectionActive = false;
                var concept = lattice.concepts[d.conceptId];
                // Schedule a concept deselection.
                concept.scheduler.run(function()
                {
                    concept.isFocused = false;
                    rerender();
                });
            }
            // Abort any object selections.
            tooltip.hide(d);
            objectSelectionScheduler.stop();
            rerender();
        });
    }
    /**
     * Returns a list of concepts that match the version filter.
     */
    function compileConceptList(lattice, versionFilter)
    {
        var versionFilterWrapper = function(el)
        {
            return versionFilter(el.version);
        };
        var conceptsFiltered = d3.values(lattice.concepts).filter(versionFilterWrapper);
        for (var i = 0; i < conceptsFiltered.length; i++)
        {
            var concept = conceptsFiltered[i];
            concept.objectsFiltered = concept.objects.filter(versionFilterWrapper);
             function sortFunc(a, b) {
                  // var sortingArr = [ 'b', 'c', 'b', 'b', 'c', 'd' ];
                  return dataTableArray.indexOf(a.objectId) - dataTableArray.indexOf(b.objectId);
                }

                concept.objectsFiltered = concept.objectsFiltered.sort(sortFunc);
        }
        return conceptsFiltered;
    }
    /**
     * Returns a list of concept edges that match the version filter.
     */
    function compileConceptEdgeList(lattice, conceptList, versionFilter)
    {
        return conceptList.reduce(
            // For each concept in the list ...
            function(result, current)
            {
                // For each child of the concept ...
                current.children.forEach(function(childEdge)
                {
                    // Add the edge to the list if its version matches.
                    if (versionFilter(childEdge.version))
                    {
                        result.push(
                        {
                            isMultilayer: childEdge.isMultilayer,
                            from: current,
                            to: lattice.concepts[childEdge.conceptId],
                            dummies: childEdge.dummies.map(function(id)
                            {
                                return lattice.concepts[id];
                            }),
                            version: childEdge.version
                        });
                    }
                });
                return result;
            }, []);
    }
    /**
     * Computes visual attributes of the lattice,
     * e.g. concept and object coordinates and opacity, object radii, layer heights, etc.
     */
    function computeConceptVisualsAndLayerHeights(visualization, lattice, conceptList, versionFilter, layerHeights)
    {
        var i, j, concept, objectEdge, version;
        // Sort the concept according to their layer (ascending order).
        conceptList.sort(function(a, b)
        {
            return a.layer < b.layer ? -1 : a.layer > b.layer ? 1 : 0;
        });
        var spaceForObjects = (visParams.conceptWidth - visParams.conceptPadding * 2);
        var objectsPerRow = Math.floor((spaceForObjects + visParams.objectMargin) / (visParams.objectMaxSize + visParams.objectMargin));
        // Compute the min and max object edge weights.
        var minObjectEdgeWeight = Number.MAX_VALUE;
        var maxObjectEdgeWeight = 0;
        var fullConceptList = d3.values(lattice.concepts);
        for (i = 0; i < fullConceptList.length; i++)
        {
            concept = fullConceptList[i];
            for (j = 0; j < concept.objects.length; j++)
            {
                objectEdge = concept.objects[j];
                for (version in objectEdge.weights)
                {
                    var weight = objectEdge.weights[version];
                    if (weight < minObjectEdgeWeight) minObjectEdgeWeight = weight;
                    if (weight > maxObjectEdgeWeight) maxObjectEdgeWeight = weight;
                }
            }
        }
        var minRadius = visParams.objectMinSize / 2;
        var maxRadius = visParams.objectMaxSize / 2;
        var minObjectEdgeArea = Math.PI * minRadius * minRadius;
        var maxObjectEdgeArea = Math.PI * maxRadius * maxRadius;

        window.objectSizeScale = [minObjectEdgeWeight, maxObjectEdgeWeight, minObjectEdgeArea, maxObjectEdgeArea];
        // Compute the visual attributes.
        for (i = 0; i < conceptList.length; i++)
        {
            concept = conceptList[i];
            var rowNumber = Math.ceil(concept.objectsFiltered.length / objectsPerRow);
            concept.width = concept.isDummy ? visParams.dummyWidth : visParams.conceptWidth;
            concept.height = rowNumber * visParams.objectMaxSize + (rowNumber - 1) * visParams.objectMargin + visParams.conceptPadding * 2;
            // Make sure the concept has at least minimal height.
            concept.height = Math.max(concept.height, visParams.minConceptHeight);
            // Update the current layer height.
            var layerHeight = concept.height + visParams.layerMargin;
            if (layerHeights[concept.layer])
            {
                layerHeights[concept.layer] = Math.max(layerHeights[concept.layer], layerHeight, visParams.minLayerHeight);
            }
            else
            {
                layerHeights[concept.layer] = layerHeight;
            }
            computeConceptCoordinates(concept, layerHeights);
            // Compute visual attributes of the contained objects. (Or rather of the "object edges")
            for (j = 0; j < concept.objectsFiltered.length; j++)
            {
                objectEdge = concept.objectsFiltered[j];
                var row = Math.floor(j / objectsPerRow);
                var column = j % objectsPerRow;
                objectEdge.x = visParams.conceptPadding + column * (visParams.objectMaxSize + visParams.objectMargin) + visParams.objectMaxSize / 2;
                objectEdge.y = visParams.conceptPadding + row * (visParams.objectMaxSize + visParams.objectMargin) + visParams.objectMaxSize / 2;
                objectEdge.radii = {};
                for (version in objectEdge.weights)
                {
                    if (!versionFilter(version)) continue;
                    var alpha = (objectEdge.weights[version] - minObjectEdgeWeight) / (maxObjectEdgeWeight - minObjectEdgeWeight);
                    if (maxObjectEdgeWeight == minObjectEdgeWeight) alpha = 0;
                    var area = minObjectEdgeArea * (1 - alpha) + maxObjectEdgeArea * alpha;
                    objectEdge.radii[version] = Math.sqrt(area / Math.PI);
                }
            }
        }
        // Make dummy nodes as tall as their layer.
        for (i = 0; i < conceptList.length; i++)
        {
            concept = conceptList[i];
            if (concept.isDummy)
            {
                concept.height = layerHeights[concept.layer] - 2 * visParams.dummyLayerMargin;
                computeConceptCoordinates(concept, layerHeights);
            }
        }

        function computeConceptCoordinates(concept, layerHeights)
        {
            var margin = concept.isDummy ? visParams.dummyMargin : visParams.conceptMargin;
            // Position specifies left coord of the space taken up by the concept.
            concept.x = concept.position + margin;
            // Sum the heights of all the preceding layers.
            var previousLayersTotalHeight = d3.keys(layerHeights).filter(function(l)
            {
                return parseInt(l) < concept.layer;
            }).reduce(function(result, currentLayer)
            {
                return result + layerHeights[currentLayer];
            }, 0);
            concept.y = visParams.bottomY - previousLayersTotalHeight - concept.height - visParams.layerMargin;
            // Dummy nodes take up the whole layer ignoring the margins.
            if (concept.isDummy) concept.y += visParams.layerMargin / 2 - visParams.dummyLayerMargin;
            concept.bottomJunction = {
                x: concept.x + concept.width / 2,
                y: concept.y + concept.height
            };
            concept.topJunction = {
                x: concept.x + concept.width / 2,
                y: concept.y
            };
        }
    }

    function centerFieldOfView(conceptList, visualization)
    {
        var bbox = {
            x1: Number.MAX_VALUE,
            y1: Number.MAX_VALUE,
            x2: -Number.MAX_VALUE,
            y2: -Number.MAX_VALUE
        };
        for (var i = 0; i < conceptList.length; i++)
        {
            var concept = conceptList[i];
            bbox.x1 = concept.x < bbox.x1 ? concept.x : bbox.x1;
            bbox.y1 = concept.y < bbox.y1 ? concept.y : bbox.y1;
            bbox.x2 = (concept.x + concept.width) > bbox.x2 ? (concept.x + concept.width) : bbox.x2;
            bbox.y2 = (concept.y + concept.height) > bbox.y2 ? (concept.y + concept.height) : bbox.y2;
        }
        bbox.x1 -=300;

        if(visParams.legendBoundingBox.x < bbox.x1)
            bbox.x1 = visParams.legendBoundingBox.x
        if(visParams.legendBoundingBox.y < bbox.y1)
            bbox.y1 = visParams.legendBoundingBox.y

        var newCenter = {
            x: (bbox.x1 + bbox.x2 ) / 2,
            y: (bbox.y1 + bbox.y2) / 2
        };
        var currentCenter = {
            x: visualization.fieldOfView.x + visualization.fieldOfView.width / 2,
            y: visualization.fieldOfView.y + visualization.fieldOfView.height / 2
        };
        var delta = {
            x: newCenter.x - currentCenter.x,
            y: newCenter.y - currentCenter.y
        };
        var margin = visParams.initialFieldOfViewMargin;
        visualization.fieldOfView.x = bbox.x1 - margin;
        visualization.fieldOfView.y = bbox.y1 - margin -5;
        visualization.fieldOfView.width = bbox.x2 - bbox.x1 + 2 * margin +2*visParams.legendBoundingBox.width;
        visualization.fieldOfView.height = bbox.y2 - bbox.y1 + 2 * margin ;
        visualization.fieldOfView.zoom = 1;
        visualization.bbox = bbox;
        updateSvgViewBox(visualization);
    }
    /**
     * Figures out which objects and concepts are selected, returns their leist and adds
     * selection information to the lattice itself.
     * Output:
     *   selectedConcepts - list of concepts that are currently selected
     *   selectedObjectEdges - list of object edges (circles) that are currently selected
     */
    function addSelectionInformationAndFindSelectedObjects(visualization, conceptList, conceptEdgeList, selectedConcepts, selectedObjectEdges)
    {
        for (var i = 0; i < conceptList.length; i++)
        {
            var concept = conceptList[i];
            concept.isSelected = false;
            if (concept.isDummy) continue;
            for (var j = 0; j < concept.objectsFiltered.length; j++)
            {
                var objectEdge = concept.objectsFiltered[j];
                // visualization.isSelectionActive = true;
                // visualization.focusedObject = 2074080772;
                // Check whether the object edge is selected.
                objectEdge.isFocused = objectEdge.objectId === visualization.focusedObject;
                objectEdge.isSelected = objectEdge.isFocused;
                // If the object edge is selected, then its concept is selected too.
                concept.isSelected = concept.isSelected || objectEdge.isFocused;
                if (objectEdge.isSelected)
                {
                    // Save the parent concept. (will need it for rendering obj.diff. edge later)
                    objectEdge.conceptId = concept.id;
                    selectedObjectEdges.push(objectEdge);
                }
            }
            if (visualization.focusedObject == null && visualization.focusedConcept != null)
            {
                concept.isSelected = concept.isSelected || concept == visualization.focusedConcept;
                var isChildOfFocused = visualization.focusedConcept.childrenTransitive.some(function(c)
                {
                    return c.conceptId == concept.id;
                });
                var isParentOfFocused = visualization.focusedConcept.parentsTransitive.some(function(c)
                {
                    return c.conceptId == concept.id;
                });
                concept.isSelected = concept.isSelected || isChildOfFocused || isParentOfFocused;
                for (j = 0; j < concept.objectsFiltered.length; j++)
                {
                    objectEdge = concept.objectsFiltered[j];
                    objectEdge.isSelected = concept.isSelected;
                }
            }
        }
        conceptList.forEach(function(c)
        {
            if (c.isSelected) selectedConcepts.push(c);
        });
        // Add selection information to the edges.
        for (i = 0; i < conceptEdgeList.length; i++)
        {
            var edge = conceptEdgeList[i];
            edge.isSelected = selectedConcepts.indexOf(edge.from) != -1 && selectedConcepts.indexOf(edge.to) != -1;
        }
    }
    /**
     * Adds extra edges ("dashed edges") between the concepts whose intents form
     * a set-subset relation.
     */
    function addExtraEdgesToEdgeList(selectedConcepts, conceptEdgeList)
    {
        var selectedEdges = conceptEdgeList.filter(function(e)
        {
            return e.isSelected;
        });
        // Find all extra edges among the selected ones.
        for (var i = 0; i < selectedConcepts.length; i++)
        {
            var conceptA = selectedConcepts[i];
            for (var j = 0; j < selectedConcepts.length; j++)
            {
                var conceptB = selectedConcepts[j];
                if (i === j) continue;
                if (isSubset(conceptA.intent, conceptB.intent))
                {
                    var existingEdge = findEdge(conceptEdgeList, conceptA, conceptB);
                    if (!existingEdge)
                    {
                        var extraEdge = {
                            from: conceptA,
                            to: conceptB,
                            isMultilayer: false,
                            isExtra: true,
                            isSelected: true
                        };
                        conceptEdgeList.push(extraEdge);
                        selectedEdges.push(extraEdge);
                    }
                }
            }
        }
        // Filter out redundant transitive extra edges.
        for (i = 0; i < selectedConcepts.length; i++)
        {
            conceptA = selectedConcepts[i];
            for (j = 0; j < selectedConcepts.length; j++)
            {
                conceptB = selectedConcepts[j];
                for (var k = 0; k < selectedConcepts.length; k++)
                {
                    var conceptC = selectedConcepts[k];
                    if (i == j || j == k || i == k) continue;
                    var edgeAB = findEdge(selectedEdges, conceptA, conceptB);
                    var edgeBC = findEdge(selectedEdges, conceptB, conceptC);
                    var edgeAC = findEdge(selectedEdges, conceptA, conceptC);
                    if (edgeAB && edgeBC && edgeAC && edgeAC.isExtra)
                    {
                        var index = conceptEdgeList.indexOf(edgeAC);
                        if (index != -1) conceptEdgeList.splice(index, 1);
                    }
                }
            }
        }

        function findEdge(edges, conceptA, conceptB)
        {
            return edges.find(function(e)
            {
                return e.from == conceptA && e.to == conceptB;
            });
        }
    }
    /**
     * Computes a list of layer separators and their visual attributes.
     */
    function computeLayerSeparatorVisuals(visualization, layerHeights)
    {
        var layers = d3.keys(layerHeights).map(function(el)
        {
            return parseInt(el);
        });
        var minLayer = d3.min(layers);
        var maxLayer = d3.max(layers);
        // Compute visual attributes of the layer separators.
        var separatorList = [];
        var currentHeight = 0;
        for (var layer = minLayer; layer <= maxLayer - 1; layer++)
        {
            currentHeight += layerHeights[layer + ""] ? layerHeights[layer + ""] : visParams.minLayerHeight;
            var separatorY = visParams.bottomY - currentHeight - visParams.layerMargin / 2;
            separatorList.push(
            {
                y: separatorY
            });
        }
        return separatorList;
    }

    function labelSeparatorVisuals(visualization, layerHeights, separatorList)
    {
        var layers = d3.keys(layerHeights).map(function(el)
        {
            return parseInt(el);
        });
        var minLayer = d3.min(layers);
        var maxLayer = d3.max(layers);
        // Compute visual attributes of the layer separators.
        var separatorList = [];
        var currentHeight = 0;
        for (var layer = minLayer; layer <= maxLayer ; layer++)
        {
            currentHeight += layerHeights[layer + ""] ? layerHeights[layer + ""] : visParams.minLayerHeight;
            var separatorY = visParams.bottomY - currentHeight - visParams.layerMargin / 2;
            if (layer ==1)
                separatorList.push(
            {
                y: separatorY,
                height: layerHeights[layer],
                // num: "Degree 1 (individual sets)"
                num: "Base sets"
            });
            else
            separatorList.push(
            {
                y: separatorY,
                height: layerHeights[layer],
                // num: "Degree " + layer+ " ("+layer + "-set intersection)"
                num: layer + "-set intersection"
            });
        }
        return separatorList;
    }

    /**
     * Figures out if there's a need for an object diff edge and if so, computes it visual attributes.
     */
    function computeObjectDiffEdgeVisuals(visualization, conceptList, selectedObjectEdges, versionA, versionB)
    {
        var objectDiffEdge = {};
        // If a selection has been made, render the 'object diff edge'.
        if (visualization.isSelectionActive && selectedObjectEdges.length > 1)
        {
            // Comparator to sort the object edges according to the layer of the concept they belong to.
            var comparator = function(edgeA, edgeB)
            {
                var conceptLayerA = conceptList.find(function(el)
                {
                    return el.id === edgeA.conceptId
                }).layer;
                var conceptLayerB = conceptList.find(function(el)
                {
                    return el.id === edgeB.conceptId
                }).layer;
                if (conceptLayerA > conceptLayerB) return -1;
                else if (conceptLayerA === conceptLayerB) return 0;
                else return 1;
            };
            var edgesA = selectedObjectEdges.filter(function(el)
            {
                return (el.version & versionA) == versionA;
            }).sort(comparator);
            // Edges that are in B, but maybe in A too.
            var edgesB = selectedObjectEdges.filter(function(el)
            {
                return (el.version & versionB) == versionB;
            }).sort(comparator);
            // // Edges that are in A, but not in B.
            // var edgesA  = selectedObjectEdges.filter(function (el) {
            //     return (el.version & versionA) > 0 && (el.version & versionB) == 0;
            // }).sort(comparator);
            // // Edges that are in B, but not in A.
            // var edgesB  = selectedObjectEdges.filter(function (el) {
            //     return (el.version & versionB) > 0 && (el.version & versionA) == 0;
            // }).sort(comparator);
            // Edges that are both in A and in B.
            var edgesAB = selectedObjectEdges.filter(function(el)
            {
                return (el.version & (versionA | versionB)) == (versionA | versionB);
            }).sort(comparator);
            var edgeA = edgesA.length > 0 ? edgesA[0] : null;
            var edgeB = edgesB.length > 0 ? edgesB[0] : null;
            var edgeAB = edgesAB.length > 0 ? edgesAB[0] : null;
            // PersonA- modifying to get object diff edge between two highest hats
            var edgeCanBeDrawn = false;
            if (edgeA && edgeB)
            {
                if (edgeA.conceptId == edgeB.conceptId) edgeCanBeDrawn = false;
                else edgeCanBeDrawn = true;
            }
            // var edgeCanBeDrawn = (edgeA && edgeB) || (edgeA && edgeAB) || (edgeAB && edgeB);
            if (!edgeCanBeDrawn)
            {
                return null;
            }
            // Figure out edge direction.
            if (edgeA)
            {
                objectDiffEdge.from = edgeA;
                objectDiffEdge.to = edgeB ? edgeB : edgeAB;
            }
            else if (edgeB)
            {
                objectDiffEdge.from = edgeA ? edgeA : edgeAB;
                objectDiffEdge.to = edgeB;
            }
            var conceptFrom = conceptList.find(function(el)
            {
                return el.id === objectDiffEdge.from.conceptId;
            });
            var conceptTo = conceptList.find(function(el)
            {
                return el.id === objectDiffEdge.to.conceptId;
            });
            objectDiffEdge.fromX = conceptFrom.x + objectDiffEdge.from.x;
            objectDiffEdge.fromY = conceptFrom.y + objectDiffEdge.from.y;
            objectDiffEdge.toX = conceptTo.x + objectDiffEdge.to.x;
            objectDiffEdge.toY = conceptTo.y + objectDiffEdge.to.y;
            objectDiffEdge.deltaX = objectDiffEdge.toX - objectDiffEdge.fromX;
            objectDiffEdge.deltaY = objectDiffEdge.toY - objectDiffEdge.fromY;
            objectDiffEdge.length = Math.sqrt(objectDiffEdge.deltaX * objectDiffEdge.deltaX + objectDiffEdge.deltaY * objectDiffEdge.deltaY);
        }
        else
        {
            // If no selection has been made or object is only in one concept, do not render the edge.
            return null;
        }
        return objectDiffEdge;
    }
    /**
     * Generates path data for concept edges. (Line/polyline for single/multi-layer edges)
     */
    function constructConceptEdgePathString(edge)
    {
        if (!edge.isMultilayer)
        {
            return "M" + edge.from.topJunction.x + "," + edge.from.topJunction.y + " " + "L" + edge.to.bottomJunction.x + "," + edge.to.bottomJunction.y;
        }
        else
        {
            var path = "M" + edge.from.topJunction.x + "," + edge.from.topJunction.y + " ";
            for (var i = 0; i < edge.dummies.length; i++)
            {
                var dummy = edge.dummies[i];
                path += "L" + dummy.bottomJunction.x + "," + dummy.bottomJunction.y + " " + "L" + dummy.topJunction.x + "," + dummy.topJunction.y + " ";
            }
            path += "L" + edge.to.bottomJunction.x + "," + edge.to.bottomJunction.y;
            return path;
        }
    }
    /////////////////// Utilities /////////////////
    function hash(s)
    {
        var nHash = 0;
        if (!s.length) return nHash;
        for (var i = 0, imax = s.length, n; i < imax; ++i)
        {
            n = s.charCodeAt(i);
            nHash = ((nHash << 5) - nHash) + n;
            nHash = nHash & nHash; // Convert to 32-bit integer
        }
        return Math.abs(nHash);
    }

    function clone(obj)
    {
        var copy;
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;
        // Handle Date
        if (obj instanceof Date)
        {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }
        // Handle Array
        if (obj instanceof Array)
        {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++)
            {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }
        // Handle Object
        if (obj instanceof Object)
        {
            copy = {};
            for (var attr in obj)
            {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }
        throw new Error("Unable to copy obj! Its type isn't supported.");
    }

    function hexToRgb(hex)
    {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
        {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function Scheduler(delay)
    {
        var timer;
        var isCompleted = true;
        this.run = function(task)
        {
            this.stop();
            isCompleted = false;
            timer = setTimeout(function()
            {
                task();
                isCompleted = true;
            }, delay);
        };
        this.stop = function()
        {
            if (!isCompleted) clearTimeout(timer);
        };
    }

    function isSubset(subset, set)
    {
        for (var i = 0; i < subset.length; i++)
        {
            var element = subset[i];
            if (set.indexOf(element) == -1) return false;
        }
        return true;
    }
    return vis;
}