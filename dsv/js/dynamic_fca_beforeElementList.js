function DynaSet()
{

    // User interface parameters.
    guiParams = {
        shape: "circle", // "square" or "circle" --square shape has problems in diff view
        mainVisHeight: 50,
        previewWidth: 80, // When editing, be sure to update CSS values t0o.
        previewHeight: 50,
        previewMargin: 5,
        previewBorder: 1,
        selectionBarHeight: 25,
        authorEvolutionSvgBarsHeight: 8,
        authorEvolutionSvgBarsPadding: 1,
        authorListRowHeight: 30,
        authorListSvgWidth: 50,
        authorEvolutionLegendHeight: 20,
        authorTimelineBarColor: "black",
        authorTimelineWidth: 70
    };
    window.orderBy = "type"; // "weight", "type", "list"
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
    window.durationValue = "300";
    window.minTopTimelineHeight = 80;
    window.setViewHeight = d3.select("#setView").node().getBoundingClientRect().height;
    // Visualization parameters.
    visParams = {
        // Any value would do, visualization gets centered anyway.
        bottomY: 0,
        // conceptWidth: 75,
        // conceptWidth: 150,
        // conceptWidth: 200,
        conceptWidth: 300,
        minConceptHeight: 23,
        conceptMargin: 10,
        conceptPadding: 4,
        dummyWidth: 5,
        dummyMargin: 3,
        // Distance from a dummy node to a layer border.
        dummyLayerMargin: 10,
        objectMinSize: 5,
        objectMaxSize: 25,
        objectMargin: 2,
        minLayerHeight: 50,
        cardinalityBoxWidth: 1,
        // layerMargin: 100,
        layerMargin: 120,
        layerLabelsFontSize: 12,
        zoomStep: 1.05,
        minZoom: 0.2,
        maxZoom: 5,
        // Margins from the edges of the visualization for the initial field of view.
        initialFieldOfViewMargin: 30,
        intentLabelFontSize: 16,
        intentNonLabelRectHeight: 0.4, //[0, 1] calculated as intentNonLabelRectHeight * intentLabelFontSize
        intentNonLabelSmallRectHeight: 1,

        outOfFocusOpacity: 0.3,
        outOfFocusEdgesOpacity: 0.0,
        // outOfFocusConceptOpacity: 0.2,
        // outOfFocusConceptOpacity: 1.0,
        outOfFocusConceptOpacity: 0.3,
        // Please only use hex values here.
        // diffColorA: "#ED7D31",
        // diffColorB: "#4472c4",
        diffColorA: "#000000",
        diffColorB: "#000000",
        diffColorAB: "#000000",
        diffStrokeA: "3,3",
        diffStrokeB: "20,5",
        diffStrokeAB: "",
        diffEdgeFillOpacity: 0.5,
        highlightColor: "#ffe699",
        previewBarOpacity: 0.4,
        legendBoundingBox:
        {}
    };
    resizeHandler = null;
    window.diffVersionArray = [];
    window.count = 0;
    window.objects = {};

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
                        // (Re)construct the UI.
                        createCopyOfFullName(aggregatedLattice);
                        computeIntersections(aggregatedLattice);
                        window.numberOftimesteps = lattices.length;
                        window.timeLineDataForConcepts = computeTimeLineData(aggregatedLattice, lattices, versions);
                        window.timeLineDataForObjects = calculateObjectTimelineData(aggregatedLattice);
                        window.numObjectsOverTime = calculateObjectsOverTime(aggregatedLattice, lattices, versions);
                        deconstructGui();

                        var numObjects = Object.keys(timeLineDataForObjects).length;
                        if ("0" in timeLineDataForObjects)
                            numObjects--;
                        d3.selectAll(".numObjects").text(numObjects);
                        d3.selectAll(".numTimesteps").text(versions.length);
                        // d3.select("#datasetInformation tspan").text(window.datasetInformation[datasetIndex]);

                        constructGui(aggregatedLattice, versions, filenames);
                        calculateMaxObjectsofDegree();
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
        for (var i = 0; i < conceptKeys.length; i++)
        {
            lattice.concepts[conceptKeys[i]].copyOfFullName = lattice.concepts[conceptKeys[i]].fullName;
        }
    }

    function computeNodeFilteringMetric(lattice, version)
    {
        var conceptKeys = Object.keys(lattice.concepts);
        for (var i = 0; i < conceptKeys.length; i++)
        {
            var currentConcept = lattice.concepts[conceptKeys[i]];
            var objectCount = 0;

            if ("objectsFiltered" in currentConcept)
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
        // $('#loader').modal('show');
        d3.select("#loader2").style("display","block");
        if(datasetIndex ==7 || datasetIndex == 8)
            window.paperDetailsPresent = true;
        else
            window.paperDetailsPresent = false;

        var lattices = [];
        filenames = [];
        var filesRead = 0;
        dataObjectKeys = [];
        window.inputRawData = [];
        window.selectedConceptIdForHighlight = [];
        window.maxObjectsInAnyDegree = undefined;
        $('#showExclusive').prop("checked", false);

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
            window.inputRawData.push(inputContext);
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
                window.maxNumOfObjectsInAnyConcept = calculateMaxObjectsInConcept(lattices);

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
                window.numberOftimesteps = lattices.length;
                window.timeLineDataForConcepts = computeTimeLineData(aggregatedLattice, lattices, versions);
                window.timeLineDataForObjects = calculateObjectTimelineData(aggregatedLattice);
                window.numObjectsOverTime = calculateObjectsOverTime(aggregatedLattice, lattices, versions);
                deconstructGui();
                window.numIntersections = 0;
                for (var cid in aggregatedLattice.concepts)
                {
                    var conceptName = aggregatedLattice.concepts[cid].fullName;
                    if ((!aggregatedLattice.concepts[cid].isDummy) && conceptName.split(", ").length > 1)
                        window.numIntersections++;
                }

                var numObjects = Object.keys(timeLineDataForObjects).length;
                if ("0" in timeLineDataForObjects)
                    numObjects--;
                d3.selectAll(".numObjects").text(numObjects);
                d3.selectAll(".numTimesteps").text(versions.length);
                d3.selectAll(".numIntersections").text(window.numIntersections);



                d3.select("#datasetInformation tspan").text(window.datasetInformation[datasetIndex]);

                constructGui(aggregatedLattice, versions, filenames);
                // constructList(lattice);
                calculateMaxObjectsofDegree();
                window.timelineDataDict = calculateTimelineStatisticsForSelectedObjects(Object.keys(aggregatedLattice.objects));
                window.hackCounter=0;
                drawTopTimeline(timelineDataDict, {},  true);
                drawTopRangeTimeline(timelineDataDict, {}, true)
                
               
                
            }
        }


        //This is a bug where I do not know why aggregate button has to be clicked when files are loaded from select data drop down. This is not required when data is loaded by dragging files in svg area.
        $("#buttonPanel input").click();
        d3.select("#loader2").style("display","none");
        return this;
    }

    function calculateMaxObjectsInConcept(lattices)
    {
        var max = -1;
        for(var i=0; i<lattices.length; i++)
        {
            for(var cid in lattices[i].concepts)
            {
                if(!lattices[i].concepts[cid].isDummy && lattices[i].concepts[cid].name.length>0)
                {
                    // console.log(lattice.concepts[cid].objects);
                    if((lattices[i].concepts[cid].objects.length > max))
                    {
                        max = lattices[i].concepts[cid].objects.length ;
                        // console.log(lattices[i].concepts[cid]);
                    }
                }
            }
        }
        if(max > -1)
            return max;
        else 
            return window.maxNumOfObjectsInAnyConcept;
    }

    function calculateObjectsOverTime(aggregatedLattice, lattices, versions)
    {
        var data = {};
        // for(var objectId in aggregatedLattice.objects)
        // {
        //     data[objectId]
        // }
        // for(var i=0; i<lattices.length; i++)
        // {
        //     var tempnum = Object.keys(lattices[i].objects).length;
        //     if(0 in lattices[i].objects)
        //         tempnum--;
        //     data[Math.pow(2,i)] = tempnum;


        // }
        var objects = aggregatedLattice.objects;
        for (var i = 0; i < lattices.length; i++)
        {
            var timestep = Math.pow(2, i);
            var tempnum = 0;
            for (var objectid in objects)
            {
                if (objectid != "0")
                {
                    if (objects[objectid].version & timestep > 0)
                    {
                        tempnum++;
                    }
                }
            }
            data[timestep] = tempnum;
        }
        return data;

    }

    function computeIntersections(lattice)
    {
        window.allConceptNames = conceptNames(lattice);
      
        window.colors_g = ['#1a8e6a', '#6762a2', '#ec6502', '#7cc522', '#eb298d', '#9f1214'];
        // window.colors_g = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#a65628','#f781bf','#999999'];

        for (var key in lattice.concepts)
        {
            tempName = lattice.concepts[key].copyOfFullName;
            lattice.concepts[key].intersections = [];
            if (typeof tempName != "undefined")
            {
                var res = tempName.split(", ");
                for (var i = 0; i < res.length; i++)
                {
                    pos = allConceptNames.indexOf(res[i]);
                    if (pos >= 0)
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
        var conceptNames = [];
        var conceptNameDict = {};
        // for(var i=0; i<conceptKeys.length; i++ )
        //     conceptNames.append(lattice.concept[])
        for (var key in lattice.concepts)
        {
            tempName = lattice.concepts[key].copyOfFullName;
            if (typeof tempName != "undefined")
            {
                var res = tempName.split(", ");
                for (var i = 0; i < res.length; i++)
                {
                    if (!(res[i] in conceptNameDict))
                        conceptNameDict[res[i]] = 0;
                }
                // if( res.length==1 && (!(res[i] in conceptNameDict)))
                //     conceptNameDict[res[0]]=lattice.concepts[key].order;

            }
            // conceptNames.push(lattice.concepts[key].copyOfFullName);
        }

        var orderCounter = 0;
        for (var key in conceptNameDict)
        {
            conceptNameDict[key] = orderCounter;
            orderCounter += 1;
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
            if (tempallconcepts[key]["isDummy"] == false)
            {
                if (tempallconcepts[key]["name"].split(",").length == 1)
                {

                    if (tempallconcepts[key]["name"] == tempallconcepts[key]["fullName"])
                    {
                        tempDict[tempallconcepts[key]["name"]] = tempallconcepts[key]["position"];
                    }
                }

            }
        }

        var items = Object.keys(tempDict).map(function(key)
        {
            return [key, tempDict[key]];
        });

        // Sort the array based on the second element
        items.sort(function(first, second)
        {
            return first[1] - second[1];
        });

        conceptNamesArray = [];
        for (var i = 0; i < items.length; i++)
        {
            conceptNamesArray.push(items[i][0]);
        }
        // return Object.keys(conceptNameDict);
        return conceptNamesArray;
    }

    function computeTimeLineData(aggregatedLattice, lattices, versions)
    {
        var data = {};
        for (var i = 0; i < lattices.length; i++)
        {
            for (var conceptId in lattices[i].concepts)
            {
                if (data[conceptId] == undefined)
                    data[conceptId] = {};
                var objects = lattices[i].concepts[conceptId].objects;
                var numOfFilteredObjects = 0;
                for (var j = 0; j < objects.length; j++)
                {
                    if ((objects[j].version & Math.pow(2, i)) > 0)
                        numOfFilteredObjects++;
                    // if(conceptId == 1389224513)
                    //     console.log((objects[j].version & Math.pow(2,i)), i, j, numOfFilteredObjects, objects[j].version );
                }
                data[conceptId][Math.pow(2, i)] = numOfFilteredObjects;
            }
        }
        return data;
    }

    /**
     * Takes a lattice and a set of versions and construct all the UI elements,
     * including the visualizations themselves.
     */
    function constructGui(lattice, versions, versionLabels)
    {

        window.clickedArrows = {};
        window.clearFocussedConceptEdges = true;
        // Construct main visualization.
        constructList(lattice, versions);
        var mainVisDivHeight = d3.select("#mainVisualization").node().getBoundingClientRect().height - 24;

        var mainCanvas = d3.select("#mainVisualization").attr("style", "border:none").append("svg").attr("position", "absolute");
        // if(guiParams.mainVisHeight< mainVisDivHeight)
        {
            guiParams.mainVisHeight = mainVisDivHeight;
            mainCanvas.attr("height", mainVisDivHeight);
        }
        var arrowDef = d3.select("#arrowHead").html();
        var filter = d3.select("#blurFilter").html();
        mainCanvas.html(arrowDef + filter);
        // mainCanvas.append(filter);
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
        window.selectedType = "aggregate";
        mainVisualization.focusedObject = null;
        mainVisualization.focusedConcept = null;
        //@PersonA-
        currentVersion = versions;
        // window.mainVisualization = mainVisualization;
        var svgClickHandler = $("#mainVisualization svg");
        d3.select("#mainVisualization svg").on("mousedown", function()
        {
            window.isSVGRequiredToHandleClickInWhiteArea = true;
        });
        d3.select("#mainVisualization svg").on("mouseup", function()
        {

            if (window.isSVGRequiredToHandleClickInWhiteArea)
            {
                if (beingDragged) handleClick = false
                isDragging = false;
                handleClick = true;

                if (!window.clickAndDragged)
                    if (handleClick)
                    {
                        // window.clickedArrows = {};
                        if (d3.event.defaultPrevented) return;
                        if (beingDragged) return;
                        // d3.event.preventDefault();
                        mainVisualization.focusedObject = null;
                        mainVisualization.isSelectionActive = false;
                        objectSelectedInObjectListBoolean = false;
                        // mainVisualization.focusedConcept = null;
                        dataTableObject.rows('.selected').nodes().to$() // Convert to a jQuery object
                            .removeClass('selected');
                        // window.selectedConceptIdForHighlight = -1;
                        // d3.selectAll("rect.border").attr("style","stroke-opacity:0;");
                        render(lattice, currentVersion, mainVisualization, false, false);

                        // render(lattice, currentVersion, mainVisualization, false, false);
                        // renderList(lattice, currentVersion, window.selectedType);


                    }

                window.clickAndDragged = false;
                window.mouseDowned = false;
            }
        });



        // svgClickHandler
        d3.select("#mainVisualization svg").on("click", function() {
            // window.tooltip.hide();
        });
        d3.select("#adjustIcon").on("click", function()
        {
            d3.event.stopPropagation();

            render(lattice, currentVersion, mainVisualization, false, true)
        });
        // d3.select("#adjustIcon").on("mouseover",function(){
        //     d3.select(this).attr("style", function(){
        //         // var s = "margin:2px;border-width: 2px;border-style:ridge";
        //         var s = "box-shadow:5px 5px";
        //         return s;
        //         });
        // });
        // d3.select("#adjustIcon").on("mouseleave",function(){
        //     d3.select(this).attr("style", function(){
        //         var s = "margin:2px;border-width: 0px;border-style:ridge";
        //         return s;
        //         });
        // });

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
            window.selectedType = type;
            render(lattice, versions, mainVisualization, true, false);
            render(lattice, currentVersion, mainVisualization, false, false);
            renderList(lattice, versions, type);

        };
        constructNavigation(lattice, versions, versionLabels, navigateCallback);
        constructColorLegend();
    }
    function constructColorLegend()
    {
        d3.select("#colorLegend").selectAll("*").remove();
        var div = d3.select("#colorLegend");
        var dimension=d3.select("#colorLegendRow").node().getBoundingClientRect().height;
        var spaceBetweenNames = 10;
        for(var setName of allConceptNames)
        {
            var color = colors_g[allConceptNames.indexOf(setName)];
            div.append("div").attr({
                // "width":dimension,
                // "height":dimension,
                "class":"legendElementPosition colorDiv",
                "style":function(d){
                    return " background-color:"+color+"; color:"+color+";display:inline-grid; width:"+(dimension-2)+"px; height:"+(dimension-2)+"px;";
                }
            });
            // .text("abc");
            div.append("span").attr("style"," display:inline-block;width:5px;height:"+dimension+"px;").attr("class","legendElementPosition");

            div.append("div").attr("class","legendElementPosition").text(setName);
            div.append("span").attr("style"," display:inline-block;width:"+spaceBetweenNames+"px;height:"+dimension+"px;").attr("class","legendElementPosition");

        }
        // allConceptNamesIdsDictFiltered
    }

    function constructList(lattice, versions)
    {
        // d3.select("#listView").html("");
        var objectsInCurrentVersions = [];
        var inactiveElementsIndex = Object.keys(lattice.objects).length;
        var activeElementsIndex = 0;
        var dataForTable = [];
        window.authorSelectionEvolutionId = [];
        window.allVersions = versions;
        window.allLattice = lattice;

        for (key in lattice.objects)
        {
            var tempObject = lattice.objects[key];
            var objectPresentFlag = false;
            for (var i = 0; i < versions.length; i++)
            {
                if (tempObject.version & versions[i])
                {
                    objectPresentFlag = true;
                    break;
                }
            }
            if (tempObject.name)
            {
                if (objectPresentFlag)
                {
                    objectsInCurrentVersions.push(tempObject.name);
                    var sumWeights = 0;
                    var len = 0;
                    for (k in tempObject.weightsInVersions)
                    {
                        kk = +k;
                        if (versions.includes(kk))
                        {
                            len++;
                            sumWeights += tempObject.weightsInVersions[k];
                        }
                    }
                    dataForTable.push([tempObject.name, activeElementsIndex++, sumWeights, 0]);
                }
                else
                    dataForTable.push([tempObject.name, inactiveElementsIndex++, 0, 0]);
            }
        }


        objectsArray = [];

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
        window.dataTables_clicked_row_index = 0;

        $(document).ready(function()
        {

            $('#listExample').DataTable(
            {
                // "scrollY": guiParams.mainVisHeight - 180,
                // "scrollY": window.setViewHeight - 200,
                "scrollY": d3.select(".top-row").node().getBoundingClientRect().height - d3.select("#currentSelection").node().getBoundingClientRect().height,
                // "scrollY": d3.select("#setView").node().getBoundingClientRect().height - 250,
                // "scrollY": d3.select("#setView").node().getBoundingClientRect().height - d3.select("#datasetView").node().getBoundingClientRect().height - 130,
                "bInfo": false,
                "scrollCollapse": true,
                destroy: true,
                "paging": false,
                "order": [],
                language:
                {
                    // "search":"<i class='icon-search'></i>"
                    search: "_INPUT_",
                    // searchPlaceholder: "Search ..."

                },
                // data: dataTableDataset,
                data: dataForTable,
                columns: [
                {
                    title: "Object Name",
                    "width": "200px"
                },
                {
                    title: "Active",
                    visible: false
                },
                {
                    title: "Sum",
                    visible: true,
                    render: $.fn.dataTable.render.number(',', '.', 2)
                },
                {
                    title: "Timeline",
                    visible: true,
                    "orderable": false,
                    "width": visParams.conceptWidth
                }]

            });
            var table = $('#listExample').DataTable();
            dataTableObject = table;


            d3.selectAll('#listExample tr').each(function(index)
            {
                d3.select(this).selectAll("td").each(function(d, i)
                {
                    if (i == 0)
                        d3.select(this).classed("dataTableNameDiv", true);
                });
                // $(this)[0].childNodes[0].addClass("dataTableNameDiv")
            });

            $('#listExample tr').addClass(function(index, currentClass)
            {
                // console.log($(this));
                // if( objectsInCurrentVersions.indexOf($(this)[0].childNodes[0].innerText)>-1)
                var sumColumn = parseFloat($(this)[0].childNodes[1].innerText.replace(",", ""));
                // console.log(sumColumn);
                if (sumColumn > 0)
                    return 'activeListItem';
                else
                    return 'inactiveListItem';
            });

            $('#listExample tbody').off('click');
            $('#listExample tbody').on('click', 'tr', function()
            {
                window.dataTables_clicked_row_index = $(this).index();
                // console.log(dataTables_clicked_row_index);
                if ($(this).hasClass('selected'))
                {
                    $(this).removeClass('selected');
                    mainVisualization.focusedObject = null;
                    mainVisualization.isSelectionActive = false;
                    objectSelectedInObjectListBoolean = false;
                    render(lattice, currentVersion, mainVisualization, false, false);
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
                    render(lattice, currentVersion, mainVisualization, false, false);
                    drawAuthorEvolution(selectedObjectId, object);

                }
            });
            $('#listExample tbody').on('contextmenu', 'tr', function(evt)
            {
                var data = table.row(this).data();
                
                evt.preventDefault();
                if(window.paperDetailsPresent)
                    listOfPapers(window.selectedVersions, data[0]);
                else
                    alert("Paper details not preent");
            });

            $('.dataTables_scrollHead').on('click', function()
            {
                // datatable.order([1,"asc"], table.order());
                // console.log(table.order());
                // console.log(table.rows().data());
                var tdata = table.rows().data();
                tarray = [];
                for (var i = 0; i < tdata.length; i++)
                {
                    tarray.push(parseInt(reverseObjectDict[tdata[i][0]]));
                }
                // console.log(tarray);
                dataTableArray = tarray;
                render(lattice, currentVersion, mainVisualization, true, false);
                render(lattice, currentVersion, mainVisualization, true, false);
                showExclusiveMembership();

            });

            $('#orderDropDown').on('change', function()
            {
                var x = document.getElementById("orderDropDown");
                window.orderBy = x.value;
                render(window.allLattice, currentVersion, mainVisualization, true, false);
                render(window.allLattice, currentVersion, mainVisualization, true, false);
                showExclusiveMembership();
                return;
            });
            $('#showExclusive').on('change', function()
            {
                showExclusiveMembership();
                return;
            });

            // var tt = d3.select("#listExample_wrapper").insert("div", ":first-child").attr("style", "display:inline-block; padding-left:10px").text("  # Objects:  ");
            var tt = d3.select("#selectionObjectsNum").insert("div", ":first-child").attr("style", "display:inline-block; padding-left:10px").text("  # Selected elements:  ");
            tt.append("div").attr("id", "selectedNumObjects").style("display", "inline-block");
            tt.append("div").style("display", "inline-block").text("/");
            tt.append("div").style("display", "inline-block").attr("id", "TotalNumObjects").text(d3.select("#numObjects").text());
            d3.select("#listExample_filter").attr("style", "display:contents").select("label").attr("style", "padding-left:10px;");
            d3.select("#listExample_filter").append("i").attr("class", "icon-search");
            // var tempString = d3.select("#listExample_filter").select("label").html();
            // // tempString = tempString.substring(7,tempString.length);
            // var addIconString = "<i class='icon-search'></i>";
            // d3.select("#listExample_filter").select("label").html(addIconString+tempString);

        });
    }

    function showExclusiveMembership()
    {
        if ($('#showExclusive').prop("checked") == true)
        {
            if (window.selectedType == "diff")
            {
                $(".arcs.isNotExclusive").remove();
                $(".object.isNotExclusive").attr("style", "visibility:hidden;");
                $(".object.isExclusive").attr("style", "visibility:visible;");
            }
            else
            {
                var sel = d3.selectAll(".withoutHat").attr("style", "visibility:hidden;");
                sel.selectAll("rect").attr("style", "pointer-events:none;");
            }

        }
        else
        {
            if (window.selectedType == "diff")
            {
                $(".object.isNotExclusive").attr("style", "visibility:visible;");
            }
            else
            {
                var sel = d3.selectAll(".withoutHat").attr("style", "visibility:visible;");
                sel.selectAll("rect").attr("style", "pointer-events:all;");
            }

        }
    }

    function drawAuthorEvolution(selectedObjectId, object)
    {
        if (authorSelectionEvolutionId.indexOf(selectedObjectId) < 0)
        {
            authorSelectionEvolutionId.push(selectedObjectId);
            window.authorEvolutionSvgHeight = (allConceptNames.length) * (guiParams.authorEvolutionSvgBarsHeight + guiParams.authorEvolutionSvgBarsPadding);
            var tr = d3.select("#navigation table tbody").append("tr").attr("class", "authorEvolutionRow").attr("id", selectedObjectId).attr('style', 'padding-top:15px;');
            var authorNametd = tr.append("td");

            var t = d3.transition()
                .duration(3000);

            authorNametd.append("span").attr("style", "padding-left:6px").text(object.name + ": ");
            evolutionSvgContainer = tr.append("div").attr("id", "authorEvolutionDiv").attr("class", "authorEvolutionDiv").attr("style","padding-left:30px").attr("height", authorEvolutionSvgHeight).style("opacity", 0);
            evolutionSvgContainer.transition(t).style("opacity", 1);

            tr.append("td").append("img").attr("src", "images/close.png")
                .attr("height", "20px")
                .attr("width", "20px")
                .attr("style", "border:1;position:absolute")
                .on("click", function(d, i)
                {
                    var t = d3.select(this);
                    var td = t[0][0].parentNode;
                    // console.log(d,i, t[0][0].parentNode.parentNode.id);
                    var oid = parseInt(t[0][0].parentNode.parentNode.id);
                    var index = authorSelectionEvolutionId.indexOf(oid);
                    if (index > -1)
                    {
                        authorSelectionEvolutionId.splice(index, 1);
                    }

                    t[0][0].parentNode.parentNode.remove();

                })
                .on("mouseover", function(d, i)
                {
                    d3.select(this).transition()
                        .ease("ease-in")
                        .duration("200")
                        .attr("height", "30px")
                        .attr("width", "30px");

                })
                .on("mouseout", function(d, i)
                {
                    d3.select(this).transition()
                        .ease("ease-out")
                        .delay("100")
                        .duration("200")
                        .attr("height", "20px")
                        .attr("width", "20px");
                });

            for (var i = 0; i < window.allVersions.length; i++)
            {


                var div = evolutionSvgContainer.append("div").classed("svgContainer preview", true).attr("style", "border:1px;border-color:white;border-style:solid");
                // div.append('svg')
                //         .attr("width", guiParams.previewWidth)
                //         .attr("height", "20px");
                // var x = d3.scale.linear()
                // .range([0, width]);
                var barscale = d3.scale.linear().domain([0, objectSizeScale[1]]).range([0, guiParams.previewWidth * (3 / 4.0)]);

                var outertickheight = guiParams.authorEvolutionLegendHeight * 4.0 / 10;
                var fontsize = guiParams.authorEvolutionLegendHeight * 6.0 / 10;

                var svg = div.append('svg').classed("evolutionSVG", true)
                    .attr("width", guiParams.previewWidth)
                    .attr("height", authorEvolutionSvgHeight + guiParams.authorEvolutionLegendHeight);

                // svg.append("g")
                //       .attr("class", "x axis")
                //       .attr("transform", "translate(0," + guiParams.authorEvolutionLegendHeight + ")")    
                //       .call(xAxis);

                svg.append('line')
                    .attr("x1", guiParams.previewWidth / 4)
                    .attr("y1", guiParams.authorEvolutionLegendHeight - outertickheight)
                    .attr("x2", guiParams.previewWidth / 4)
                    .attr("y2", guiParams.authorEvolutionLegendHeight)
                    .attr('style', 'stroke:black');

                svg.append('text').append('tspan')
                    .text("0")
                    .attr('text-anchor', "middle")
                    .attr("x", guiParams.previewWidth / 4)
                    .attr("y", (guiParams.authorEvolutionLegendHeight - outertickheight) - 3)
                    .attr("style", "font-size:" + fontsize);

                svg.append('line')
                    .attr("x1", guiParams.previewWidth - 1)
                    .attr("y1", guiParams.authorEvolutionLegendHeight - outertickheight)
                    .attr("x2", guiParams.previewWidth - 1)
                    .attr("y2", guiParams.authorEvolutionLegendHeight)
                    .attr('style', 'stroke:black');

                svg.append('text').append('tspan')
                    .text(parseFloat(objectSizeScale[1]).toFixed(2))
                    .attr('text-anchor', "end")
                    .attr("x", guiParams.previewWidth - 1)
                    .attr("y", (guiParams.authorEvolutionLegendHeight - outertickheight) - 3)
                    .attr("style", "font-size:" + fontsize);

                numberofinnerticks = 4;

                for (var ticks = 0; ticks < numberofinnerticks; ticks++)
                {
                    svg.append('line')
                        .attr("x1", (guiParams.previewWidth / 4.0 + ticks * (guiParams.previewWidth * 3 / 4.0) / numberofinnerticks))
                        .attr("y1", guiParams.authorEvolutionLegendHeight - outertickheight * 0.6)
                        .attr("x2", (guiParams.previewWidth / 4.0 + ticks * (guiParams.previewWidth * 3 / 4.0) / numberofinnerticks))
                        .attr("y2", guiParams.authorEvolutionLegendHeight)
                        .attr('style', 'stroke:black; stroke-opacity: 0.5');
                }


                objectConcepts = object.concepts;
                var filteredObjectConcepts = [];
                for (var j = 0; j < objectConcepts.length; j++)
                {
                    if (allVersions[i] in objectConcepts[j].weights)
                        filteredObjectConcepts.push(objectConcepts[j]);
                }

                intersectionDict = {};
                conceptDict = {};
                contributions = {};
                for (var item in allConceptNames)
                {
                    contributions[allConceptNames[item]] = 0;
                }

                for (var j = 0; j < filteredObjectConcepts.length; j++)
                {
                    var n = window.allLattice.concepts[filteredObjectConcepts[j].conceptId].name;
                    if (n.length > 0)
                    {
                        conceptDict[n] = true;
                        if (objectConcepts[j].weights[allVersions[i]])
                            contributions[n] = objectConcepts[j].weights[allVersions[i]];
                    }
                }

                // console.log(inputRawData);
                for (var item in allConceptNames)
                {
                    contributions[allConceptNames[item]] = 0;
                }
                var dictOfAttributes = inputRawData[i].attributes;
                for (var key in dictOfAttributes)
                {
                    dictOfAttributes[key]['myweight'] = 0;
                }

                if (object.id in inputRawData[i].objects)
                {

                    var temp11 = inputRawData[i].objects[object.id]
                    for (var yy = 0; yy < temp11.attributes.length; yy++)
                    {
                        dictOfAttributes[temp11.attributes[yy]]['myweight'] = temp11.weights[yy];
                    }
                    // console.log(dictOfAttributes);
                    var contri = {}
                    for (var k in dictOfAttributes)
                    {
                        contri[dictOfAttributes[k].name] = dictOfAttributes[k]['myweight'];
                    }
                    contributions = contri;
                }




                var conceptDictArray = Object.keys(conceptDict);

                conceptDictArray.sort(function(a, b)
                {
                    return allConceptNames.indexOf(b) - allConceptNames.indexOf(a);
                });

                conceptDictArray.forEach(function(attr, index)
                {
                    pos = allConceptNames.indexOf(attr);
                    {
                        var pad = 0;
                        var labelPad = 1;
                        var conceptTopPad = 0;
                        fillColor = colors_g[pos];
                        svg.append('rect')
                            .attr("class", "textBackground")
                            .attr("x", guiParams.previewWidth / 4)
                            .attr("y", (guiParams.authorEvolutionLegendHeight + pos * (guiParams.authorEvolutionSvgBarsHeight + guiParams.authorEvolutionSvgBarsPadding)))
                            .attr("width", barscale(contributions[attr]))
                            .attr("height", guiParams.authorEvolutionSvgBarsHeight)
                            .attr("fill", guiParams.authorTimelineBarColor)
                            .append("title").text(function(d)
                            {
                                return "#" + attr + ": " + contributions[attr];
                            });

                        svg.append('rect')
                            .attr("class", "textBackground")
                            .attr("x", 3)
                            .attr("y", (guiParams.authorEvolutionLegendHeight + pos * (guiParams.authorEvolutionSvgBarsHeight + guiParams.authorEvolutionSvgBarsPadding)))
                            .attr("rx", 2)
                            .attr("ry", 2)
                            .attr("width", guiParams.previewWidth / 4 - 6)
                            // .attr("width", guiParams.authorEvolutionSvgBarsHeight)
                            .attr("height", guiParams.authorEvolutionSvgBarsHeight)
                            .attr("fill", fillColor)
                            .append("title").text(function(d)
                            {
                                return "#" + attr + ": " + contributions[attr];
                            });
                    }
                });

                svg.append("line")
                    .attr("x1", guiParams.previewWidth / 4)
                    .attr("y1", guiParams.authorEvolutionLegendHeight + 0)
                    .attr("x2", guiParams.previewWidth / 4)
                    .attr("y2", guiParams.authorEvolutionLegendHeight + authorEvolutionSvgHeight)
                    .attr("style", "stroke:rgb(200,200,200);stroke-width:2");

                svg.append("rect")
                    .attr("x", 0)
                    .attr("y", guiParams.authorEvolutionLegendHeight)
                    .attr("width", guiParams.previewWidth)
                    .attr("height", authorEvolutionSvgHeight)
                    .attr("style", "stroke-width: 2px; stroke:black; fill:none");
            }

            evolutionSvgContainer.selectAll("div").on("click", function(d, j)
            {
                navigateCallbackWrapper([allVersions[j]], "aggregate");
            });



        }

    }

    function calculateObjectTimelineData(lattice)
    {
        var versions = [];
        var objectTimelineDataDict = {};

        for (var i = 0; i < window.numberOftimesteps; i++)
            versions.push(Math.pow(2, i));

        for (key in lattice.objects)
        {
            if (!(key in objectTimelineDataDict))
                objectTimelineDataDict[key] = {};

            var tempObject = lattice.objects[key];
            for (var i = 0; i < versions.length; i++)
            {
                var maxContributionsInSelectedTimestamps = -1;
                var objectPresentFlag = false;
                if (tempObject.version & versions[i])
                {
                    objectTimelineDataDict[key][versions[i]] = tempObject.weightsInVersions[versions[i]];
                }
                else
                {
                    objectTimelineDataDict[key][versions[i]] = 0;
                }
            }
        }
        return objectTimelineDataDict;
    }

    function updateObjectListWithSelection(objectsFiltered, isSelectionFromNavigation, isSelectionFromTaperedEdge)
    {
        var objectIdArray = [];
        if (isSelectionFromTaperedEdge != undefined && isSelectionFromTaperedEdge == true)
            objectIdArray = objectsFiltered;
        else
        {
            for (var i = 0; i < objectsFiltered.length; i++)
            {
                if (isSelectionFromNavigation == undefined || isSelectionFromNavigation == false)
                    objectIdArray.push(objectsFiltered[i].objectId);
                else
                    objectIdArray.push(objectsFiltered[i].id);

            }
        }
        if (objectIdArray.indexOf(0) >= 0)
            d3.select("#selectedNumObjects").text(objectIdArray.length - 1);
        else
            d3.select("#selectedNumObjects").text(objectIdArray.length);

        renderList(window.allLattice, window.selectedVersions, window.selectedType, objectIdArray);
    }

    function renderList(lattice, versions, type, objectIdArray)
    {
        var objectsInCurrentVersions = [];
        var inactiveElementsIndex = Object.keys(lattice.objects).length;
        var activeElementsIndex = 0;
        var dataForTable = [];
        var maxContributionsInSelectedTimestamps = -1;

        for (key in lattice.objects)
        {
            var tempObject = lattice.objects[key];
            var objectPresentFlag = false;
            for (var i = 0; i < versions.length; i++)
            {
                if (tempObject.version & versions[i])
                {
                    objectPresentFlag = true;
                    break;
                }
            }
            if (tempObject.name)
            {
                if (objectPresentFlag)
                {
                    objectsInCurrentVersions.push(tempObject.name);
                    var sumWeights = 0;
                    var len = 0;
                    for (k in tempObject.weightsInVersions)
                    {
                        kk = +k;
                        if (versions.includes(kk))
                        {
                            len++;
                            sumWeights += tempObject.weightsInVersions[k];
                        }
                    }
                    if (objectIdArray != undefined)
                    {
                        if (objectIdArray.indexOf(tempObject.id) > -1)
                            dataForTable.push([tempObject.name, activeElementsIndex++, sumWeights, 0]);
                        else
                            continue;
                    }
                    else
                        dataForTable.push([tempObject.name, activeElementsIndex++, sumWeights, 0]);
                    if (maxContributionsInSelectedTimestamps < sumWeights) maxContributionsInSelectedTimestamps = sumWeights;
                }
                else
                {

                    if (objectIdArray != undefined)
                    {
                        if (objectIdArray.indexOf(tempObject.id) > -1)
                            dataForTable.push([tempObject.name, inactiveElementsIndex++, 0, 0]);
                    }
                }
            }
        }



        datatable = $('#listExample').DataTable();

        datatable.rows().every(function(rowIdx, tableLoop, rowLoop)
        {
            // var d = this.data();
            this.data(dataForTable[rowIdx]);

            // d.counter++; // update data source for the row

            // this.invalidate(); // invalidate the data DataTables has cached for this row
        });
        //  datatable.clear();
        // datatable.order([1,"asc"]);
        // datatable.rows.add(dataForTable);
        // d3.select("#listExample").selectAll("tr").data(dataForTable).append("tr");
        if (objectIdArray != undefined)
        {
            // d3.selectAll("#listExample tbody tr").remove();
            // for(var x=0; x<dataForTable.length; x++)
            //     d3.select("#listExample tbody").append("tr");
            d3.selectAll("#listExample tbody tr").each(function(d, i)
            {
                if (i >= dataForTable.length)
                {
                    d3.select(this).attr("style", "display:none;");
                }
                else
                {
                    d3.select(this).attr("style", "display:table-row;");
                }
            });
        }
        else
        {
            d3.selectAll("#listExample tbody tr").each(function(d, i)
            {
                d3.select(this).attr("style", "display:table-row;");
            });
        }

        datatable.draw();
        // console.log(dataTables_clicked_row_index);
        // if(mainVisualization.focusedObject!=null)
        //     datatable.row(dataTables_clicked_row_index).scrollTo(false);

        var objectsInCurrentVersions = [];
        for (key in lattice.objects)
        {
            var tempObject = lattice.objects[key];
            var objectPresentFlag = false;
            for (var i = 0; i < versions.length; i++)
            {
                if (tempObject.version & versions[i])
                {
                    objectPresentFlag = true;
                    break;
                }
            }
            if (objectPresentFlag)
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
            var objectName = this.childNodes[0].innerText;
            d3.select(this.childNodes[0]).html("");
            // console.log(this.childNodes[0]);

            var authorSvg = d3.select(this.childNodes[0]).insert("svg", "td");
            authorSvg.attr('style', 'background-color: white');


            var span = d3.select(this.childNodes[0]).append("span").attr('style', 'margin-left:5px');
            span.text(objectName);


            drawAuthorSetMembership(lattice, authorSvg, versions, objectName, maxContributionsInSelectedTimestamps, type);

        });
        $('#listExample tr').addClass(function(index, currentClass)
        {
            // console.log($(this));
            // if( objectsInCurrentVersions.indexOf($(this)[0].childNodes[0].innerText)>-1)
            var sumColumn = parseFloat($(this)[0].childNodes[1].innerText.replace(",", ""));
            // console.log(sumColumn);
            if (sumColumn > 0)

                return 'activeListItem';
            else
                return 'inactiveListItem';
        });

        d3.selectAll("#listExample tr").on("mouseenter", function(d, j)
        {
            var objectName = this.childNodes[0].innerText;
            var objectEdge = lattice.objects[reverseObjectDict[objectName]];
            var object = lattice.objects[objectEdge.id];

            d3.selectAll("g.object").attr("opacity", 0.0);
            d3.selectAll("g.objectid" + object.id).attr("opacity", 1);
        });

        d3.selectAll("#listExample tr").on("mouseleave", function(d, j)
        {

            d3.selectAll("g.object").attr("opacity", 1);
            // d3.selectAll("g.objectid"+object.id).style("visibility","visible");
        });


        d3.selectAll("#listExample tr").on("mouseover", function(d, j)
        {
            var e = d3.event;
            var objectName = this.childNodes[0].innerText;
            var objectEdge = lattice.objects[reverseObjectDict[objectName]];
            var object = lattice.objects[objectEdge.id];
            visualization.focusedObject = object.id;
            var concept = lattice.concepts[objectEdge.concepts[0].conceptId];
            concept.isFocused = true;
            visualization.focusedObject = object.id;
            selectedObjectId = visualization.focusedObject;
            visualization.isSelectionActive = true;

            // drawAuthorEvolution(object.id, object);
            objectSelectionScheduler.run(function()
            {
                // rerender();
                render(lattice, currentVersion, visualization, false, false);
                d3.selectAll("path.objectDiffEdge").classed("diffEdgeHidden", true);
                d3.select("#diff" + object.id).classed("diffEdgeHidden", false);
                d3.event = e;
                // tooltip.show(d);
            });
            // console.log(objectName + " hovered");

            // drawAuthorEvolution(object.id, object);
        })

        d3.selectAll("#listExample tr").on("mouseout", function(d, j)
        {
            objectSelectionScheduler.run(function()
            {
                d3.selectAll("path.objectDiffEdge").classed("diffEdgeHidden", true);
                for (var edge in window.clickedArrows)
                    d3.selectAll("." + edge).classed("diffEdgeHidden", false);
            });
        });
        // Add Timeline
        $('#listExample tr').addClass(function(index, currentClass)
        {
            if (index > 0)
            {
                var timelineColumn = d3.select($(this)[0].childNodes[2]);
                timelineColumn.html("");
                // timelineColumn.attr("width", visParams.conceptWidth);


                // Draw Timeline
                var timelineBoxHeight = guiParams.authorListRowHeight;
                var leftPadding = 0;
                var timelineBoxWidth = guiParams.authorTimelineWidth - leftPadding;
                var heightScale = d3.scale.linear().domain([0, window.objectSizeScale[1]]).range([-4, -timelineBoxHeight]);
                // var heightScale = d3.scale.log().base(Math.E).domain([0,window.objectSizeScale[1]]).range([0, -timelineBoxHeight]);
                var widthScale = d3.scale.linear().domain([1, window.numberOftimesteps]).range([leftPadding + 2, timelineBoxWidth - 6]);

                timelineColumn = timelineColumn.append("svg")
                    .attr(
                    {
                        "width": timelineBoxWidth,
                        "height": timelineBoxHeight,
                        "style": "border:1px solid #cccccc"
                    });
                var timelineGroup = timelineColumn.append("g");

                // timelineGroup.append("rect")
                //     .attr({
                //         x1: 0,
                //         y1: 0,
                //         "width": timelineBoxWidth,
                //         "height": timelineBoxHeight,
                //         "stroke": "#grey",
                //         "stroke-width":3,
                //         "fill":"none"
                //     })

                // timelineGroup.append("line")
                //     .attr({
                //         x1: leftPadding,
                //         y1: 0,
                //         x2: leftPadding,
                //         y2: timelineBoxHeight,
                //         "stroke": "#grey",
                //         "stroke-width":1
                //     })
                // timelineGroup.append("line")
                //     .attr({
                //         x1: leftPadding,
                //         y1: timelineBoxHeight,
                //         x2: widthScale(window.numberOftimesteps),
                //         y2: timelineBoxHeight,
                //         "stroke": "#grey",
                //         "stroke-width":1
                //     })

                var table = $('#listExample').DataTable();
                var data = $(this)[0].childNodes[0].innerText;
                var objectEdge = lattice.objects[reverseObjectDict[data]];
                if (objectEdge == undefined)
                {
                    console.log(objectEdge, data);
                }
                if (objectEdge != undefined)
                {
                    var object = lattice.objects[objectEdge.id];
                    var currentObjectId = object.id;


                    timelineGroup.append("polyline")
                        .attr(
                        {
                            "points": function(d)
                            {
                                pointstring = "";
                                var objectData = window.timeLineDataForObjects[currentObjectId];


                                var timesteps = Object.keys(objectData);
                                for (var i = 0; i < window.numberOftimesteps; i++)
                                {
                                    var x = widthScale(i + 1);
                                    var versionNum = Math.pow(2, i);
                                    var y = -1;
                                    if (versionNum in objectData)
                                    {
                                        if (objectData[versionNum] == undefined) objectData[versionNum] = 0;
                                        y = (timelineBoxHeight) + heightScale(objectData[versionNum]);
                                    }
                                    else
                                        y = (timelineBoxHeight);
                                    // console.log(x,y, versionNum, objectData);
                                    pointstring += x + "," + y + " ";
                                    if ((versions.length == 2 && window.selectedType == "diff") || (versions.length == 1 && window.selectedType == "aggregate"))
                                    {


                                        if (versions.indexOf(versionNum) > -1)
                                        {
                                            timelineGroup.append("circle")
                                                .attr(
                                                {
                                                    "cx": x,
                                                    "cy": y,
                                                    "r": 2,
                                                    // "fill":"#ffe699"
                                                    "fill": "black"
                                                });
                                        }
                                    }
                                }
                                return pointstring;
                            },
                            "fill": "none",
                            "stroke": "black",
                            "stroke-width": 1
                        });
                }
            }


        });
    }

    function drawAuthorSetMembership(lattice, svg, versions, objectName, maxContributionsInSelectedTimestamps, type)
    {
        var objectEdge = lattice.objects[reverseObjectDict[objectName]];

        if (objectEdge != undefined)
        {
            var object = lattice.objects[objectEdge.id];
            var individualBarPadding = 0.5;
            // var svgheight = (allConceptNames.length)*(guiParams.authorEvolutionSvgBarsHeight+ guiParams.authorEvolutionSvgBarsPadding);
            var svgheight = guiParams.authorListRowHeight;
            var individualBarHeight = svgheight / (2 * individualBarPadding + allConceptNames.length);
            var individualBarHeightWithPadding = svgheight / (allConceptNames.length);
            // console.log(individualBarHeight, individualBarPadding, individualBarHeightWithPadding  );

            svg.attr('width', guiParams.authorListSvgWidth)
                .attr("height", svgheight);


            if (versions.length == 1)
            {
                i = 0;


                objectConcepts = object.concepts;
                var filteredObjectConcepts = [];
                for (var j = 0; j < objectConcepts.length; j++)
                {
                    if (versions[i] in objectConcepts[j].weights)
                        filteredObjectConcepts.push(objectConcepts[j]);
                }

                intersectionDict = {};
                conceptDict = {};
                contributions = {};
                for (var item in allConceptNames)
                {
                    contributions[allConceptNames[item]] = 0;
                }

                for (var j = 0; j < filteredObjectConcepts.length; j++)
                {
                    var n = lattice.concepts[filteredObjectConcepts[j].conceptId].name;
                    if (n.length > 0)
                    {
                        conceptDict[n] = true;
                        if (objectConcepts[j].weights[versions[i]])
                            contributions[n] = objectConcepts[j].weights[versions[i]];
                    }
                }
                var conceptDictArray = Object.keys(conceptDict);

                conceptDictArray.sort(function(a, b)
                {
                    return allConceptNames.indexOf(b) - allConceptNames.indexOf(a);
                });


                conceptDictArray.forEach(function(attr, index)
                {
                    pos = allConceptNames.indexOf(attr);
                    {
                        var pad = 0;
                        var labelPad = 1;
                        var conceptTopPad = 0;
                        fillColor = colors_g[pos];
                        barscale = d3.scale.linear().domain([0, maxContributionsInSelectedTimestamps]).range([guiParams.authorListSvgWidth / 2, guiParams.authorListSvgWidth]);
                        svg.append('rect')
                            .attr("class", "textBackground")
                            .attr("x", 0)
                            .attr("y", ((pos * (individualBarHeightWithPadding)) + individualBarPadding))
                            // .attr("width", barscale(contributions[attr]))
                            .attr("width", guiParams.authorListSvgWidth)
                            .attr("height", individualBarHeight)
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
            else if (versions.length == 2 && type == "diff")
            {
                for (i = 0; i < 2; i++)
                {

                    objectConcepts = object.concepts;
                    var filteredObjectConcepts = [];
                    for (var j = 0; j < objectConcepts.length; j++)
                    {
                        if (versions[i] in objectConcepts[j].weights)
                            filteredObjectConcepts.push(objectConcepts[j]);
                    }

                    intersectionDict = {};
                    conceptDict = {};
                    contributions = {};
                    for (var item in allConceptNames)
                    {
                        contributions[allConceptNames[item]] = 0;
                    }

                    for (var j = 0; j < filteredObjectConcepts.length; j++)
                    {
                        var n = lattice.concepts[filteredObjectConcepts[j].conceptId].name;
                        if (n.length > 0)
                        {
                            conceptDict[n] = true;
                            if (objectConcepts[j].weights[versions[i]])
                                contributions[n] = objectConcepts[j].weights[versions[i]];
                        }
                    }
                    var conceptDictArray = Object.keys(conceptDict);

                    conceptDictArray.sort(function(a, b)
                    {
                        return allConceptNames.indexOf(b) - allConceptNames.indexOf(a);
                    });


                    conceptDictArray.forEach(function(attr, index)
                    {
                        pos = allConceptNames.indexOf(attr);
                        {
                            var pad = 0;
                            var labelPad = 1;
                            var conceptTopPad = 0;
                            fillColor = colors_g[pos];
                            barscale = d3.scale.linear().domain([0, maxContributionsInSelectedTimestamps]).range([guiParams.authorListSvgWidth / 2, guiParams.authorListSvgWidth]);
                            svg.append('rect')
                                .attr("class", "textBackground")
                                .attr("x", i * guiParams.authorListSvgWidth / 2)
                                .attr("y", ((pos * (individualBarHeightWithPadding)) + individualBarPadding))
                                // .attr("width", barscale(contributions[attr]))
                                .attr("width", guiParams.authorListSvgWidth / 2)
                                .attr("height", individualBarHeight)
                                .attr("fill", fillColor);
                        }
                    });
                    svg.append("line")
                        .attr("x1", guiParams.authorListSvgWidth / 2)
                        .attr("y1", 0)
                        .attr("x2", guiParams.authorListSvgWidth / 2)
                        .attr("y2", svgheight)
                        .attr("style", "stroke:rgb(255,255,255);stroke-width:2");
                }
            }

            else
            {
                unionConceptDict = {};

                for (i = 0; i < versions.length; i++)
                {

                    objectConcepts = object.concepts;
                    var filteredObjectConcepts = [];
                    for (var j = 0; j < objectConcepts.length; j++)
                    {
                        if (versions[i] in objectConcepts[j].weights)
                            filteredObjectConcepts.push(objectConcepts[j]);
                    }

                    intersectionDict = {};
                    conceptDict = {};
                    contributions = {};
                    for (var item in allConceptNames)
                    {
                        contributions[allConceptNames[item]] = 0;
                    }

                    for (var j = 0; j < filteredObjectConcepts.length; j++)
                    {
                        var n = lattice.concepts[filteredObjectConcepts[j].conceptId].name;
                        if (n.length > 0)
                        {
                            conceptDict[n] = true;
                            if (objectConcepts[j].weights[versions[i]])
                                contributions[n] = objectConcepts[j].weights[versions[i]];
                        }
                    }

                    for (var k in conceptDict)
                    {
                        if (conceptDict[k] == true) unionConceptDict[k] = true;
                    }

                }
                var conceptDictArray = Object.keys(unionConceptDict);

                conceptDictArray.sort(function(a, b)
                {
                    return allConceptNames.indexOf(b) - allConceptNames.indexOf(a);
                });


                conceptDictArray.forEach(function(attr, index)
                {
                    pos = allConceptNames.indexOf(attr);
                    {
                        var pad = 0;
                        var labelPad = 1;
                        var conceptTopPad = 0;
                        fillColor = colors_g[pos];
                        barscale = d3.scale.linear().domain([0, maxContributionsInSelectedTimestamps]).range([guiParams.authorListSvgWidth / 2, guiParams.authorListSvgWidth]);
                        svg.append('rect')
                            .attr("class", "textBackground")
                            .attr("x", 0)
                            .attr("y", ((pos * (individualBarHeightWithPadding)) + individualBarPadding))
                            // .attr("width", barscale(contributions[attr]))
                            .attr("width", guiParams.authorListSvgWidth)
                            .attr("height", individualBarHeight)
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
                .attr("x", 0)
                .attr("y", 0)
                .attr('style', 'stroke-width:2px;stroke:black;fill:none')
                .attr('width', guiParams.authorListSvgWidth)
                .attr('height', svgheight);
        }
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
        d3.select("#selectionObjectsNum").selectAll("*").remove();
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

    function powerSet( list ){
        var set = [],
            listSize = list.length,
            combinationsCount = (1 << listSize),
            combination;
    
        for (var i = 1; i < combinationsCount ; i++ ){
            var combination = [];
            for (var j=0;j<listSize;j++){
                if ((i & (1 << j))){
                    combination.push(list[j]);
                }
            }
            set.push(combination);
        }
        return set;
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
        // var intents = [];
        // var currentIntent = closure([]);
        // while (currentIntent != null && currentIntent.length != context.attributes.length)
        // {
        //     intents.push(currentIntent);
        //     currentIntent = getLeastGreaterIntent(currentIntent);

        // }
        // console.log(intents);
        intents = powerSet(attributesArray);
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
        // intents.shift();
        // intents.push([1815774618,866315194]);
        
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
            // console.log(getExtent(intent));
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
                var tempValue = isLexicographicallySmaller(intent, circledPlusResult, i);
                // console.log(intent, i , tempValue);
                // if(arraysAreEqual(intent, circledPlusResult)) return intent;
                if (tempValue)
                    return circledPlusResult;
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
            var tempmpdulo2 = 0;
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
                if (attrIsInIntent)
                {
                    tempmpdulo2++;
                    intent.push(attribute.id);
                }
                // if(tempmpdulo2 % 10 > 0) return intent;

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
            var weightsInVersions = {};
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

    function addTimestepTag(versions, type, tagTypeClass,degreeNum, diffVersion)
    {

        if (tagTypeClass == "timestep")
        {
            window.objects["timestep"] = {};
            window.objectsInT1 = {};
            window.objectsInT2 = {};
            for (var i = 0; i < window.selectedVersions.length; i++)
            {
                for (var obi in window.allLattice.objects)
                {
                    var ob = window.allLattice.objects[obi];

                    // console.log(ob.version, window.selectedVersions[i], ((ob.version & window.selectedVersions[i]) > 0 || ob.version == window.selectedVersions[i]) );

                    if ((ob.version & window.selectedVersions[i]) > 0 || (ob.version == window.selectedVersions[i]))
                    {
                        window.objects["timestep"][ob.id] = 1;
                        if(window.selectedType == "diff")
                        {
                            if(i==0)
                                window.objectsInT1[ob.id] = 1;
                            else if(i==1)
                                window.objectsInT2[ob.id] = 1;
                            
                        }
                    }
                }
                // console.log(window.objects);
            }
            // console.log(window.objectsInT1, window.objectsInT2);
            
            // update conceptselection
            if ("conceptSelection" in window.objects)
            {
                window.objects["conceptSelection"] = {};
                for (var i = 0; i < window.selectedVersions.length; i++)
                {
                    for(var k=0; k<window.selectedConceptIdForHighlight.length;k++)
                    {
                        window.objects["conceptSelection"][window.selectedConceptIdForHighlight[k]] = {};
                        var selectedConceptFilteredObjects = window.allLattice.concepts[window.selectedConceptIdForHighlight[k]].objectsFiltered;
                        for (var j = 0; j < selectedConceptFilteredObjects.length; j++)
                        {
                            if ((selectedConceptFilteredObjects[j].version & window.selectedVersions[i]) > 0 || (selectedConceptFilteredObjects[j].version == window.selectedVersions[i]))
                            {
                                window.objects["conceptSelection"][window.selectedConceptIdForHighlight[k]][selectedConceptFilteredObjects[j].objectId] = 1;
                            }
                        }
                    }
                }

            }

            // Update move
            if ("move" in window.objects)
            {
                window.objects["move"] = {};
                for (var i = 0; i < window.selectedVersions.length; i++)
                {

                    var selectedArrowObjects = [];
                    if (window.arrowFrom == window.arrowTo)
                        selectedArrowObjects = samelevelarrowsarray;
                    else
                        selectedArrowObjects = sortedArrowsArray;

                    var objectIds = [];
                    for (var j = 0; j < selectedArrowObjects.length; j++)
                    {
                        if (selectedArrowObjects[j]["from"] == window.arrowFrom && selectedArrowObjects[j]["to"] == window.arrowTo)
                        {
                            objectIds = selectedArrowObjects[j]["objectIds"];
                            break;
                        }

                    }
                    for (var j = 0; j < objectIds.length; j++)
                    {
                        var ob = window.allLattice.objects[objectIds[j]];
                        if ((ob.version & window.selectedVersions[i]) > 0 || (ob.version == window.selectedVersions[i]))
                            window.objects["move"][objectIds[j]] = 1;

                    }
                }

            }

            // update degree
            if ("degree" in window.objects)
            {
                window.objects["degree"] = {};
                var unionDict={};
                for(var k in window.objects)
                    for(var k2 in window.objects[k])
                        unionDict[k2]=1;

                var historgramDataObjectsArray = calculateStatistics2(Object.keys(unionDict));
                
                
                var filterdObjectsDict={};
                var tempObjects=[];
                var searchDictionary = historgramDataObjectsArray[0];
                if(window.selectedType=="diff")
                {
                    for( var deg in historgramDataObjectsArray[1])
                    {
                        for(var ob of historgramDataObjectsArray[1][deg])
                            if(searchDictionary[deg].indexOf(ob)<0)
                                searchDictionary[deg].push(ob);
                        // searchDictionary[deg][ob] =1;
                    }
                    if(window.selectedDiffVersion>-1)
                    {
                        searchDictionary = historgramDataObjectsArray[window.selectedDiffVersion];
                    }
                }
                //     searchDictionary = historgramDataObjectsArray[(i%2)];
                tempObjects = searchDictionary[window.selectedDegree];
                for(var t of tempObjects)
                {
                    filterdObjectsDict[t] = 1;
                }
                window.objects["degree"] = filterdObjectsDict;

            }

        }




        var tagContainer = d3.select("#selectionTags");
        if (tagTypeClass == "timestep")
        {


            d3.select("#timeTag").selectAll("*").remove();

        }

        if (tagTypeClass == "conceptSelection")
            tagContainer.selectAll("." + tagTypeClass).remove();

        if (tagTypeClass == "move")
            tagContainer.selectAll("." + tagTypeClass).remove();

        if (tagTypeClass == "degree")
            tagContainer.selectAll("." + tagTypeClass).remove();

        var tagSpan = "";


        if (tagTypeClass == "timestep")
        {
            tagSpan = d3.select("#timeTag").append("div").attr("class", "tagDiv " + tagTypeClass);
            tagSpan.append("i").attr("class", "icon-time tagIcons");

        }
        // else if (tagTypeClass == "conceptSelection")
        // {
        //     tagSpan = tagContainer.append("div").attr("class", "tagDiv " + tagTypeClass);
        // }
        else if (tagTypeClass == "move")
        {
            var uniqueMoveLabel = "L" + versions[0] + "L" + versions[1];
            var tempor = tagContainer.select("." + uniqueMoveLabel)[0][0];
            if (tempor != null)
                return
            tagSpan = tagContainer.append("div").attr("class", "tagDiv " + tagTypeClass);
        }
        else if (tagTypeClass == "degree")
        {
            var uniqueMoveLabel = "D" + degreeNum;
            var tempor = tagContainer.select("." + uniqueMoveLabel)[0][0];
            if (tempor != null)
                return
            tagSpan = tagContainer.append("div").attr("class", "tagDiv " + tagTypeClass);

        }

        if (type == "aggregate")
        {
            // tagSpan.append("span").attr("class", "selector_type symbol").text("}");

            tagSpan.append("div").attr("class", "selector_content").append("div").attr("class", "text").text("Aggregated");
        }
        else if (type == "individual")
        {
            var name = filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "");

            // tagSpan.append("span").attr("class", "selector_type symbol").text("}");
            tagSpan.append("div").attr("class", "selector_content").append("div").attr("class", "text").text(name);
        }
        else if (type == "diff")
        {
            var t1name = filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "");
            var t2name = filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "");


            // tagSpan.append("span").attr("class", "selector_type symbol").text("}");
            tagSpan.append("div").attr("class", "selector_content").append("div").attr("class", "text").text("" + t1name + " vs " + t2name + "");
        }

        else if (type == "conceptSelection")
        {
            // window.selectedConceptIdForHighlight;
            
            for(var k=0; k<window.selectedConceptIdForHighlight.length;k++)
            {
                var t = window.allLattice.concepts[window.selectedConceptIdForHighlight[k]];

                tagSpan = tagContainer.append("div").attr("class", "tagDiv " + tagTypeClass+" tcid"+window.selectedConceptIdForHighlight[k]);
                
                // tagSpan.append("span").attr("class", "selector_type symbol").text("J");
                tagSpan.append("i").attr("class", "icon-tag tagIcons")
                var temp = tagSpan.append("div").attr("class", "selector_content");
                var namesArray = t.fullName.split(", ");
                var numLabel = 0;
                for (var setName of allConceptNames)
                {
                    if (namesArray.indexOf(setName) > -1)
                    {
                        var color = colors_g[allConceptNames.indexOf(setName)];
                        temp.append("div").attr("class", "text").attr("style", "background-color:" + color + "; color:white;font-weight:bold").text(setName);
                        numLabel++;
                    }
                }
                tagSpan.append("i").attr("class", "icon-remove").attr("conceptIdTag",window.selectedConceptIdForHighlight[k]).on("click", function()
                {
                    // tagSpan.remove();
                    var tid = d3.select(this).attr("conceptIdTag");

                    d3.select(".tcid"+tid).remove();
                    window.selectedConceptIdForHighlight.splice(window.selectedConceptIdForHighlight.indexOf(tid), 1);
                    delete window.objects["conceptSelection"][tid];
                    // window.selectedConceptIdForHighlight = -1;
                    // mainVisualization.focusedConcept = null;

                    if(window.selectedConceptIdForHighlight.length ==0)
                    {    
                        mainVisualization.focusedConcept = null;
                        delete window.objects["conceptSelection"];
                    }
                    d3.select("rect.id"+tid).attr("style", "stroke-opacity:0;");

                    // delete window.objects["conceptSelection"];
                    d3.selectAll(".individualVersionNavigationBars").classed("barClicked", false);

                    updateListWithCurrentSelection();
                });
            }
        }

        else if (type == "move")
        {
            var arrowType = -1;
            var desc = "";
            var arrowClass = "";
            var uniqueMoveLabel = "L" + versions[0] + "L" + versions[1];

            if (versions[0] < versions[1])
            {
                arrowType = '-';
                desc = "L " + versions[0] + " to L" + versions[1];
                arrowClass = "icon-arrow-up";
                tagSpan.append("i").attr("class", arrowClass + " " + uniqueMoveLabel + " tagIcons").attr("style", "font-size:small");

            }
            else if (versions[0] > versions[1])
            {
                arrowType = '/';
                desc = "L " + versions[0] + " to L" + versions[1];
                arrowClass = "icon-arrow-down"
                tagSpan.append("i").attr("class", arrowClass + " " + uniqueMoveLabel + " tagIcons").attr("style", "font-size:small");

            }
            else
            {
                arrowType = '<>';
                desc = "L " + versions[0];
                arrowClass = "icon-resize-horizontal"
                tagSpan.append("i").attr("class", arrowClass + " tagIcons").attr("style", "font-size:large");

            }
            // tagSpan.append("span").attr("class", "selector_type symbol").text(arrowType);
            var t = tagSpan.append("div").attr("class", "selector_content").append("div").attr("class", "text").text(desc);
            tagSpan.append("i").attr("class", "icon-remove").on("click", function()
            {
                tagSpan.remove();
                var classname = "l" + versions[0] + "l" + versions[1];
                // if(!(classname in window.clickedArrows))
                // {
                d3.selectAll(".summaryArowHovered").classed("summaryArowHovered", false);
                for (var edge in window.clickedArrows)
                    d3.selectAll("path." + edge).classed("diffEdgeHidden", true);

                // }
                window.clickedArrows = {};
                delete window.objects["move"];
                updateListWithCurrentSelection();
            });

        }

        else if (type == "degree")
        {
            // window.selectedConceptIdForHighlight;
            // var t = window.allLattice.concepts[window.selectedConceptIdForHighlight];


            // tagSpan.append("span").attr("class", "selector_type symbol").text("J");
            tagSpan.append("i").attr("class", "icon-circled tagIcons")
            var temp = tagSpan.append("div").attr("class", "selector_content");
            // var namesArray = t.fullName.split(", ");
            var numLabel = 0;
            // for (var setName of allConceptNames)
            // {
                // if (namesArray.indexOf(setName) > -1)
                // {
                    // var color = colors_g[allConceptNames.indexOf(setName)];
            var textString = "";
            if(window.selectedType=="diff")
                textString = "degree="+degreeNum+" in "+filenames[window.allVersions.indexOf(window.selectedVersions[diffVersion])].replace(".csv", "")
            else
                textString = "degree="+degreeNum

            var t = tagSpan.append("div").attr("class", "selector_content").append("div").attr("class", "text").text(textString);

                    // temp.append("div").attr("class", "text").attr("style", "background-color:" + color + "; color:white;font-weight:bold").text(setName);
                    // numLabel++;
                // }
            // }
            tagSpan.append("i").attr("class", "icon-remove").on("click", function()
            {
                d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                window.selectedDegree=-1;
                window.selectedDiffVersion = -1;

                tagSpan.remove();
                delete window.objects["degree"];
                d3.selectAll(".degreeBar").attr("class","bar degreeBar");

                updateListWithCurrentSelection();
            });
        }

        var oidArrayOfSelection = [];
        for (var keys in window.objects)
        {
            for (var oid in window.objects[keys])
            {
                if (oidArrayOfSelection.indexOf(oid) < 0)
                    oidArrayOfSelection.push(oid);
            }
        }
        // var timestepObjectsArray = [], conceptObjectsArray = [], moveObjectsArray = [];
        // if(window.objects["timestep"] != undefined)
        //     timestepObjectsArray = Object.keys(window.objects["timestep"]);
        // if(window.objects["conceptSelection"] != undefined)
        //     conceptObjectsArray = Object.keys(window.objects["conceptSelection"]);
        // if(window.objects["move"] != undefined)
        //     moveObjectsArray = Object.keys(window.objects["move"]);

        updateListWithCurrentSelection();

    }

    function updateSelectionForHistogram()
    {
        var currentSelectionArray = Object.keys(window.objects);
        var filteredArrayOfArrays = [];
        var objectsInT1Array=[];
        var objectsInT2Array = [];
        for (var g = 0; g < currentSelectionArray.length; g++)
        {
            filteredArrayOfArrays.push(Object.keys(window.objects[currentSelectionArray[g]]));
        }

        var intersectedObjectList = [];
        var intersectedObjectListForHistogram = [];
        if (filteredArrayOfArrays.length > 0)
        {
            intersectedObjectList = filteredArrayOfArrays[0];
            intersectedObjectListForHistogram = filteredArrayOfArrays[0];
            objectsInT1Array = Object.keys(window.objectsInT1);
            objectsInT2Array = Object.keys(window.objectsInT2);
        }
        for (var g = 1; g < currentSelectionArray.length; g++)
        {
            intersectedObjectList = intersection(intersectedObjectList, filteredArrayOfArrays[g]);
            if(!(currentSelectionArray[g] === "degree"))
                intersectedObjectListForHistogram = intersection(intersectedObjectListForHistogram, filteredArrayOfArrays[g]);
        }
        if(window.selectedType == "diff")
        {
            objectsInT1Array = intersection(objectsInT1Array, intersectedObjectList);
            objectsInT2Array = intersection(objectsInT2Array, intersectedObjectList);
            window.objectsInT1 = {};
            window.objectsInT2 = {};
            for(var ob of objectsInT1Array)
                window.objectsInT1[ob] = 1;
            for(var ob of objectsInT2Array)
                window.objectsInT2[ob] = 1;
        }
    }

    function updateListWithCurrentSelection()
    {
        var currentSelectionArray = Object.keys(window.objects);
        var filteredArrayOfArrays = [];
        var objectsInT1Array=[];
        var objectsInT2Array = [];
        for (var g = 0; g < currentSelectionArray.length; g++)
        {
            if(currentSelectionArray[g] == "conceptSelection")
            {
                var tempar = [];
                for(var cid in window.objects[currentSelectionArray[g]])
                {
                    tempar = union(tempar,  Object.keys(window.objects[currentSelectionArray[g]][cid]))
                }
                filteredArrayOfArrays.push(tempar);
            }
            else

                filteredArrayOfArrays.push(Object.keys(window.objects[currentSelectionArray[g]]));
        }

        var intersectedObjectList = [];
        var intersectedObjectListForHistogram = [];
        if (filteredArrayOfArrays.length > 0)
        {
            intersectedObjectList = filteredArrayOfArrays[0];
            intersectedObjectListForHistogram = filteredArrayOfArrays[0];
            objectsInT1Array = Object.keys(window.objectsInT1);
            objectsInT2Array = Object.keys(window.objectsInT2);
        }
        for (var g = 1; g < currentSelectionArray.length; g++)
        {
            intersectedObjectList = intersection(intersectedObjectList, filteredArrayOfArrays[g]);
            if(!(currentSelectionArray[g] === "degree"))
                intersectedObjectListForHistogram = intersection(intersectedObjectListForHistogram, filteredArrayOfArrays[g]);
        }
        if(window.selectedType == "diff")
        {
            objectsInT1Array = intersection(objectsInT1Array, intersectedObjectList);
            objectsInT2Array = intersection(objectsInT2Array, intersectedObjectList);
            window.objectsInT1 = {};
            window.objectsInT2 = {};
            for(var ob of objectsInT1Array)
                window.objectsInT1[ob] = 1;
            for(var ob of objectsInT2Array)
                window.objectsInT2[ob] = 1;
        }

        var intersectionIntOidArray = [];
        for (var g = 0; g < intersectedObjectList.length; g++)
        {
            intersectionIntOidArray.push(parseInt(intersectedObjectList[g]));
        }
        updateObjectListWithSelection(intersectionIntOidArray, false, true);
        var timelineDataDictSelection = calculateTimelineStatisticsForSelectedObjects(intersectedObjectList);

        var temporalType = document.getElementById("topTimelineDropdown");
            
        if (temporalType.value == "presence")
        {
            d3.select("#topTimelineContainer").attr("style","display:block");
            d3.select("#topRangeContainer").attr("style","display:none");
            drawTopTimeline(window.timelineDataDict, timelineDataDictSelection, true);

        }
        else  if (temporalType.value == "value")
        {
            d3.select("#topTimelineContainer").attr("style","display:none");
            d3.select("#topRangeContainer").attr("style","display:block");
            drawTopRangeTimeline(window.timelineDataDict, timelineDataDictSelection, true);

        }

        $('#topTimelineDropdown').on('change', function()
        {
            var temporalType = document.getElementById("topTimelineDropdown");
            
            if (temporalType.value == "presence")
            {
                d3.select("#topTimelineContainer").attr("style","display:block");
                d3.select("#topRangeContainer").attr("style","display:none");
                drawTopTimeline(window.timelineDataDict, timelineDataDictSelection, true);
    
            }
            else  if (temporalType.value == "value")
            {
                d3.select("#topTimelineContainer").attr("style","display:none");
                d3.select("#topRangeContainer").attr("style","display:block");
                drawTopRangeTimeline(window.timelineDataDict, timelineDataDictSelection, true);
    
            }
        });

        calculateStatistics(intersectedObjectListForHistogram);

        function intersection(oListA, oListB)
        {
            var resultArray = [];
            for (var i = 0; i < oListA.length; i++)
            {
                if (oListB.indexOf(oListA[i]) >= 0)
                    resultArray.push(oListA[i]);
            }
            return resultArray;
        }

        function union(oListA, oListB)
        {
            var resultArray = [];
            for (var i = 0; i < oListA.length; i++)
            {
                // if (oListB.indexOf(oListA[i]) >= 0)
                    resultArray.push(oListA[i]);
            }
            for (var i = 0; i < oListB.length; i++)
            {
                if (resultArray.indexOf(oListB[i]) < 0)
                    resultArray.push(oListB[i]);
            }
            return resultArray;
        }
    }
    function calculateTimelineStatisticsForSelectedObjects(ObjectIdArray)
    {
        for( var i = 0; i < ObjectIdArray.length; i++){ 
            if ( ObjectIdArray[i] === "0") {
                ObjectIdArray.splice(i, 1); 
              i--;
            }
         }
        var data={};
        var rangeDataForSelection = [];

        for(var i=0; i<window.allVersions.length; i++)
            rangeDataForSelection.push([]);

        for(var i=0; i<window.allVersions.length; i++)
        {
            // data[filenames[i].replace(".csv", "")] = 0;
            data[allVersions[i]] = 0;
        }
        for(var i=0; i<ObjectIdArray.length; i++)
        {
            var ob = window.allLattice.objects[ObjectIdArray[i]];
            var foundInSelectedVersion = false;
            for(var j=0; j<window.allVersions.length; j++)
            {
                if((ob.version & window.allVersions[j]) >0 || (ob.version == window.allVersions[j]))
                {
                    data[allVersions[j]]++;
                    if(allVersions[j] in ob.weightsInVersions)
                        rangeDataForSelection[j].push([{"y":ob.weightsInVersions[allVersions[j]], "x":j, "objectId":ob.id}]);
                    // if(ob.weightsInVersions[allVersions[j]] == undefined)
                    //     console.log(ob.weightsInVersions, allVersions[j], j);
                }
            }
        }
        window.rangeDataForSelection = rangeDataForSelection;
        return data;
    }

    function drawTopRangeTimeline(timelineDataDictAll, timelineDataDictSelection, isFirstRender)
    {
        // var width = d3.select("#topTimeline").node().getBoundingClientRect().width / 4 * (3);
        var width = d3.select("#topRange").node().getBoundingClientRect().width/4 *3;
        var height = 50;
        window.hackCounter++;
        // var temp = window.topTimelineHeight;
        // console.log(window.hackCounter);
        if(window.hackCounter<3)
            window.topTimelineHeight = d3.select("#topTwoRows").node().getBoundingClientRect().height - d3.select("#temporalHeading").node().getBoundingClientRect().height -  d3.select("#topTimelineDropdown").node().getBoundingClientRect().height - 7;
        
        if(window.topTimelineHeight< window.minTopTimelineHeight)
            window.topTimelineHeight = window.minTopTimelineHeight;

        height = window.topTimelineHeight;
        d3.select("#topTimelineContainerRow").attr("height", height )
        var margin = {
            // left: 25 + d3.select("#topTimeline").node().getBoundingClientRect().width/8,
            left: 45,
            top: 20,
            // right: 20 + d3.select("#topTimeline").node().getBoundingClientRect().width/8,
            right: 30,
            bottom: 10
        };
        // if(isFirstRender)
        {
            var versionsArray = Object.keys(timelineDataDictAll);
            var valuesArray = window.rangeDataForSelection;

            for(var bin of valuesArray)
            {
                var values = bin.map(d => d[0].y);
                values = values.sort(function(a,b){return parseFloat(a)-parseFloat(b);});
                const min = values[0];
                const max = values[values.length - 1];
                const q1 = d3.quantile(values, 0.25);
                const q2 = d3.quantile(values, 0.50);
                const q3 = d3.quantile(values, 0.75);
                const iqr = q3 - q1; // interquartile range
                const r0 = Math.max(min, q1 - iqr * 1.5);
                const r1 = Math.min(max, q3 + iqr * 1.5);
                bin.quartiles = [q1, q2, q3];
                bin.range = [r0, r1];
                bin.outliers = bin.filter(v => v.y < r0 || v.y > r1);
                // console.log("calculation",values,min,max,q1,q2,q3,r0,r1);
            }

            var n = width / 40;

        var bins = valuesArray;
        d3.select("#topRange").selectAll("*").remove();

            const svg =  d3.select("#topRange").append("svg").attr("width", width).attr("height",height);
            var xScaleData = [];
            for(var i=0; i<window.allVersions.length; i++)
                xScaleData.push(i);

            var x = d3.scale.ordinal()
                .domain(xScaleData)
                .rangeRoundBands([margin.left, width], 0.4);

            var y = d3.scale.linear()
            // .domain([d3.min(bins, d => d.range[0]), d3.max(bins, d => d.range[1])]).nice()
            .domain([0, d3.max(bins, d => d.range[1])]).nice()
            .range([height - margin.bottom, margin.top]);

            var xAxis = g => g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(n).tickSizeOuter(0));

            var yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.select(".domain").remove());

            

            

            var g = svg.append("g")
              .selectAll("g")
              .data(bins).enter().append("g");
            //   .append("g");
          
            g.append("path")
                .attr("stroke", "black")
                .attr("d", function(d,i){
                    
                // console.log(d.range[1], y(d.range[1]));
                return `M${(x(i)+x.rangeBand()/2)},${y(d.range[1])} V${y(d.range[0])}` ;
                });
          
            g.append("path")
                .attr("fill", "#ddd")
                .attr("d", function(d,i){
                    return  `M${(x(i)+1)},${y(d.quartiles[2])}
                        H${(x(i)+x.rangeBand())}
                        V${y(d.quartiles[0])}
                        H${(x(i)+1)}
                        Z`;
            });
          
            g.append("path")
                .attr("stroke", "black")
                .attr("stroke-width", 2)
                .attr("d", function(d,i){
                    return  `M${x(i) + 1},${y(d.quartiles[1])}
                        H${x(i)+x.rangeBand()}`;
            });
          
            g.append("g")
                .attr("fill", "grey")
                .attr("fill-opacity", 0.2)
                .attr("stroke", "none")
                .attr("transform", function(d,i){ return `translate(${x(i)+x.rangeBand()/2},0)`;})
              .selectAll("circle")
              .data(d => d.outliers)
              .append("circle")
                .attr("r", 2)
                .attr("cx", () => (Math.random() - 0.5) * 4)
                .attr("cy", d => y(d.y));


            g = svg.append("g");    
            g.selectAll(".axis").select("*").remove();
   
                var tickG = g.append("g");
                var tickValues = [Math.floor(y.domain()[0]),Math.floor(y.domain()[1]/2),y.domain()[1]];
                for(var b=0; b<tickValues.length; b++)
                {
                    tickG.append("text").text(tickValues[b]).attr({
                        "x":margin.left-7,
                        "y":y(tickValues[b])+5,
                        "fill":"black",
                        "class":"y axis",
                        "text-anchor":"end"
                    })
                    ;
                    tickG.append("line").attr({
                        "x1":margin.left-5,
                        "y1":y(tickValues[b]),
                        "x2":margin.left,
                        "y2":y(tickValues[b]),
                        "stroke":"black",
                        "class":"y axis"
                    });
                }
                            
                // g.append("text")
                // .attr("x", 0)
                // .attr("y", 0)
                // .attr("dy", ".5em")
                // .style("text-anchor", "middle")
                // .text("# objects")
                // .attr("transform", " translate(" + (5) + ","+(height)/2+") rotate(-90) ")
                // .attr("class", "axisLabel");
                
                g.append("line").attr("x1", margin.left).attr("y1", margin.top).attr("x2", margin.left).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");
                g.append("line").attr("x1", margin.left).attr("y1", height-margin.bottom).attr("x2", margin.left+width).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");

        }

    }


    function drawTopTimeline(timelineDataDictAll, timelineDataDictSelection, isFirstRender)
    {
        // var width = d3.select("#topTimeline").node().getBoundingClientRect().width / 4 * (3);
        var width = d3.select("#topTimeline").node().getBoundingClientRect().width/4 *3;
        var height = 50;
        window.hackCounter++;
        // var temp = window.topTimelineHeight;
        // console.log(window.hackCounter); 
        if(window.hackCounter<3)
            window.topTimelineHeight = d3.select("#topTwoRows").node().getBoundingClientRect().height - d3.select("#temporalHeading").node().getBoundingClientRect().height -  d3.select("#topTimelineDropdown").node().getBoundingClientRect().height - 7;
        if(window.topTimelineHeight< window.minTopTimelineHeight)
            window.topTimelineHeight = window.minTopTimelineHeight;

        height = window.topTimelineHeight;
        d3.select("#topTimelineContainerRow").attr("height", height )
        var margin = {
            // left: 25 + d3.select("#topTimeline").node().getBoundingClientRect().width/8,
            left: 45,
            top: 20,
            // right: 20 + d3.select("#topTimeline").node().getBoundingClientRect().width/8,
            right: 30,
            bottom: 10
        };
        if(isFirstRender)
        {
            var versionsArray = Object.keys(timelineDataDictAll);
            var valuesArray = Object.values(timelineDataDictAll);
            
            
            // console.log("height: ",height);
            window.topTimelinexscale = d3.scale.ordinal()
                .domain(versionsArray)
                .rangeRoundBands([margin.left, width], 0.4);
            window.topTimelineyscale = d3.scale.linear().range([height-margin.bottom, 0 + margin.top]);
            var Max = d3.max(Object.values(timelineDataDictAll));
            // y.domain([0, d3.max(Object.values(historgramDataArray[0]))]);
            window.topTimelineyscale.domain([0, d3.max([0, Max])]);
            // console.log(topTimelineyscale(0));
            d3.select("#topTimeline").selectAll("*").remove();
            var svg = d3.select("#topTimeline").append("svg").attr("width", width).attr("height",height);
            var g = svg.append("g");
            var barsSelection = g.selectAll(".bar")
                    .data(valuesArray)
                    .enter().append("rect")
                    .attr("class", function(d)
                    {
                        return "bar topTimelineBar";
                    })
                    .attr("x", function(d,i)
                    {
                        return window.topTimelinexscale(versionsArray[i]);
                    })
                    .attr("y", function(d)
                    {
                        return window.topTimelineyscale(d);
                    })
                    .attr("fill", function(d)
                    {
                        return "lightgrey";
                    })
                    //   .attr("opacity", visParams.previewBarOpacity)
                    .attr("opacity", 1.0)
                    .attr("width", window.topTimelinexscale.rangeBand())
                    .attr("height", function(d)
                    {
                        // console.log(height, margin.bottom, (height-margin.bottom) - window.topTimelineyscale(d));
                        return (height-margin.bottom) - window.topTimelineyscale(d);
                    })
                    // .attr("data-toggle", "tooltip")
                    .attr("title", function(d,i)
                    {
                        return  "Total "+d + " objects in "+filenames[i];
                    });
                    // .append("title").text(function(d,i)
                    // {
                    //     return  "Total "+d + " objects in "+filenames[i];
                        
                    // });
                    d3.selectAll(".topTimelineBar").on("mouseout", function(){
                        d3.selectAll(".ui-tooltip").remove();
        
                    })
                $('.topTimelineBar').tooltip( {track:true, delay: { "show": 0, "hide": 0}});
                g.select("y-axis").select("*").remove();
                // var yAxis = d3.svg.axis()
                //     .scale(topTimelineyscale)
                //     .ticks(2)
                //     .orient("left");
                // g.append("g")
                //     .attr("class", "y-axis")
                //     .attr("transform", "translate(" + (margin.left + 5) + ",0)")
                //     .call(yAxis);
                var tickG = g.append("g");
                var tickValues = [0,Math.floor(Max/2),Max];
                for(var b=0; b<tickValues.length; b++)
                {
                    tickG.append("text").text(tickValues[b]).attr({
                        "x":margin.left-7,
                        "y":window.topTimelineyscale(tickValues[b])+5,
                        "fill":"black",
                        "class":"y axis",
                        "text-anchor":"end"
                    })
                    ;
                    tickG.append("line").attr({
                        "x1":margin.left-5,
                        "y1":window.topTimelineyscale(tickValues[b]),
                        "x2":margin.left,
                        "y2":window.topTimelineyscale(tickValues[b]),
                        "stroke":"black",
                        "class":"y axis"
                    });
                }
                            
                g.append("text")
                // .attr("transform", "translate("+0 + ",0)")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("# elements")
                .attr("transform", " translate(" + (5) + ","+(height)/2+") rotate(-90) ")
                .attr("class", "axisLabel");
                
                    // .selectAll("text").attr("dy",0);
                    // g.select("path").remove();
                    g.append("line").attr("x1", margin.left).attr("y1", margin.top).attr("x2", margin.left).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");
                    g.append("line").attr("x1", margin.left).attr("y1", height-margin.bottom).attr("x2", margin.left+width).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");

        }
        
        {
            // console.log(topTimelineyscale(0));

            var versionsArray = Object.keys(timelineDataDictSelection);
            var valuesArray = Object.values(timelineDataDictSelection);
            // height = window.topTimelineHeight;

            d3.selectAll(".topTimelineBarSelection").remove();
            var svg = d3.select("#topTimeline svg");
            var g = svg.append("g");
            var bars = g.selectAll(".topTimelineBarSelection").data(valuesArray).enter().append("rect")
            .attr("class", function(d)
            {
                return "bar topTimelineBar topTimelineBarSelection";
            })
            .attr("x", function(d,i)
            {
                return window.topTimelinexscale(versionsArray[i]);
            })
            .attr("y", function(d)
            {
                return window.topTimelineyscale(d);
            })
            .attr("fill", function(d)
            {
                return "grey";
            })
            .attr("stroke","black")
            .attr("stroke-width",function(d,i){
                if(window.selectedVersions.indexOf(window.allVersions[i])>=0)
                    return "1"
                else
                    return "0"
            })
            //   .attr("opacity", visParams.previewBarOpacity)
            .attr("opacity", 1.0)
            .attr("width", window.topTimelinexscale.rangeBand())
            .attr("height", function(d)
            {
                // console.log((height-margin.bottom) - window.topTimelineyscale(d));
                // return 0;
                return (height-margin.bottom) - window.topTimelineyscale(d);
            })
            // .attr("data-toggle", "tooltip")
            .attr("title", function(d,i)
            {
                var titleStr = "";
                // console.log()
                if(parseInt(d3.select("#selectedNumObjects").text()) == d)
                    titleStr = "All "+d3.select("#selectedNumObjects").text()+" selected elements, are present in "+filenames[i];
                else
                    titleStr =  "Among "+d3.select("#selectedNumObjects").text()+" selected elements, "+d + " objects are present in "+filenames[i];
                return titleStr;
            });
            // .append("title").text(function(d,i)
            // {
            //     return filenames[i] +": "+ d + " objects";
            // });

            d3.selectAll(".topTimelineBar").attr("stroke","black")
            .attr("stroke-width",function(d,i){
                if(window.selectedVersions.indexOf(window.allVersions[i])>=0)
                    return "1"
                else
                    return "0"
            })
            d3.selectAll(".topTimelineBarSelection").on("mouseout", function(){
                d3.selectAll(".ui-tooltip").remove();

            })


            $('.topTimelineBarSelection').tooltip( {track:true, delay: { "show": 0, "hide": 0}});

        }
        


    }
    function calculateStatistics(objectIdArray)
    {

        window.NumBaseSets = parseInt(d3.select(".numSets").text());

        var historgramDataArray = [{}, {}];
        var historgramDataObjectsArray = [{}, {}];
        // for(var j=0; j<window.selectedVersions.length; j++)
        // {
        var histogramData = {};
        var valuesArray1 = [];
        var valuesArray2 = [];
        var isDiff = false;


        for (var i = 0; i < window.NumBaseSets; i++)
        {
            historgramDataArray[0][i + 1] = 0;
            historgramDataObjectsArray[0][i + 1] = [];
            
            historgramDataArray[1][i + 1] = 0;
            historgramDataObjectsArray[1][i + 1] = [];
        }
        for (var i = 0; i < objectIdArray.length; i++)
        {
            objectIdArray[i] = parseInt(objectIdArray[i]);
            var tempDegree = 0;
            var tempDegree2 = 0;
            if (window.selectedVersions.length == 1)
            {
                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                    tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.selectedVersions[0]];

                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].weightsInVersions)
                    valuesArray1.push(window.allLattice.objects[objectIdArray[i]].weightsInVersions[window.selectedVersions[0]]);

                if (tempDegree in historgramDataArray[0])
                {
                    historgramDataArray[0][tempDegree]++;
                    historgramDataObjectsArray[0][tempDegree].push(objectIdArray[i]);
                }
            }
            else if (window.selectedVersions.length == 2 && window.selectedType == "diff")
            {
                isDiff = true;
                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                    tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.selectedVersions[0]];
                if (window.selectedVersions[1] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                    tempDegree2 = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.selectedVersions[1]];

                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].weightsInVersions)
                    valuesArray1.push(window.allLattice.objects[objectIdArray[i]].weightsInVersions[window.selectedVersions[0]]);
                if (window.selectedVersions[1] in window.allLattice.objects[objectIdArray[i]].weightsInVersions)
                    valuesArray2.push(window.allLattice.objects[objectIdArray[i]].weightsInVersions[window.selectedVersions[1]]);

                if (tempDegree in historgramDataArray[0])
                {
                    historgramDataArray[0][tempDegree]++;
                    historgramDataObjectsArray[0][tempDegree].push(objectIdArray[i]);

                }

                if (tempDegree2 in historgramDataArray[1])
                {
                    historgramDataArray[1][tempDegree2]++;
                    historgramDataObjectsArray[1][tempDegree2].push(objectIdArray[i]);
                }

            }
            if (window.selectedVersions.length == window.allVersions.length && window.selectedType == "aggregate")
            {
                tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerNumberInAggregateLattice;
                if (tempDegree in historgramDataArray[0])
                {
                    historgramDataArray[0][tempDegree]++;
                    historgramDataObjectsArray[0][tempDegree].push(objectIdArray[i]);

                }
                var sum = 0;
                var weightsDict = window.allLattice.objects[objectIdArray[i]].weightsInVersions;
                for (var v in weightsDict)
                {
                    sum += weightsDict[v];
                }
                valuesArray1.push(sum);


            }

        }
        // drawDegreeDistribution(historgramDataArray, isDiff);
        // drawDegreeDistribution2(historgramDataArray, isDiff, window.largestDegree, historgramDataObjectsArray);
        drawDegreeDistribution3(historgramDataArray, isDiff, window.largestDegree, historgramDataObjectsArray);
    }
    function calculateStatistics2(objectIdArray)
    {

        window.NumBaseSets = parseInt(d3.select(".numSets").text());

        var historgramDataArray = [{}, {}];
        var historgramDataObjectsArray = [{}, {}];
        // for(var j=0; j<window.selectedVersions.length; j++)
        // {
        var histogramData = {};
        var valuesArray1 = [];
        var valuesArray2 = [];
        var isDiff = false;
        for (var i = 0; i < window.NumBaseSets; i++)
        {
            historgramDataArray[0][i + 1] = 0;
            historgramDataObjectsArray[0][i + 1] = [];
            
            historgramDataArray[1][i + 1] = 0;
            historgramDataObjectsArray[1][i + 1] = [];
        }
        for (var i = 0; i < objectIdArray.length; i++)
        {
            objectIdArray[i] = parseInt(objectIdArray[i]);
            var tempDegree = 0;
            var tempDegree2 = 0;
            if (window.selectedVersions.length == 1)
            {
                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                    tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.selectedVersions[0]];

                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].weightsInVersions)
                    valuesArray1.push(window.allLattice.objects[objectIdArray[i]].weightsInVersions[window.selectedVersions[0]]);

                if (tempDegree in historgramDataArray[0])
                {
                    historgramDataArray[0][tempDegree]++;
                    historgramDataObjectsArray[0][tempDegree].push(objectIdArray[i]);
                }
            }
            else if (window.selectedVersions.length == 2 && window.selectedType == "diff")
            {
                isDiff = true;
                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                    tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.selectedVersions[0]];
                if (window.selectedVersions[1] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                    tempDegree2 = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.selectedVersions[1]];

                if (window.selectedVersions[0] in window.allLattice.objects[objectIdArray[i]].weightsInVersions)
                    valuesArray1.push(window.allLattice.objects[objectIdArray[i]].weightsInVersions[window.selectedVersions[0]]);
                if (window.selectedVersions[1] in window.allLattice.objects[objectIdArray[i]].weightsInVersions)
                    valuesArray2.push(window.allLattice.objects[objectIdArray[i]].weightsInVersions[window.selectedVersions[1]]);

                if (tempDegree in historgramDataArray[0])
                {
                    historgramDataArray[0][tempDegree]++;
                    historgramDataObjectsArray[0][tempDegree].push(objectIdArray[i]);

                }

                if (tempDegree2 in historgramDataArray[1])
                {
                    historgramDataArray[1][tempDegree2]++;
                    historgramDataObjectsArray[1][tempDegree2].push(objectIdArray[i]);
                }

            }
            if (window.selectedVersions.length == window.allVersions.length && window.selectedType == "aggregate")
            {
                tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerNumberInAggregateLattice;
                if (tempDegree in historgramDataArray[0])
                {
                    historgramDataArray[0][tempDegree]++;
                    historgramDataObjectsArray[0][tempDegree].push(objectIdArray[i]);

                }
                var sum = 0;
                var weightsDict = window.allLattice.objects[objectIdArray[i]].weightsInVersions;
                for (var v in weightsDict)
                {
                    sum += weightsDict[v];
                }
                valuesArray1.push(sum);


            }

        }
        // drawDegreeDistribution(historgramDataArray, isDiff);
        // drawDegreeDistribution2(historgramDataArray, isDiff, window.largestDegree, historgramDataObjectsArray);
        // window.histogramDataArray = historgramDataArray;
        // window.historgramDataObjectsArray = historgramDataObjectsArray;
        // g.attr("transform", "rotate(90) translate(0,0)");
        return historgramDataObjectsArray;

    }
    function calculateMaxObjectsofDegree()
    {
        window.NumBaseSets = parseInt(d3.select(".numSets").text());

        var historgramDataArray = [];

        var tempLargest = -1;
        var objectIdArray = Object.keys(window.allLattice.objects);

        for (var i = 0; i < objectIdArray.length; i++)
        {
            
            var tempDegree2 = 0;
            for(var j=0; j<window.allVersions.length; j++)
            { 
                var histogramData = {};
                for (var i = 0; i < window.NumBaseSets; i++)
                {
                    histogramData[i + 1] = 0;
                }
                for (var i = 0; i < objectIdArray.length; i++)
                {
                    objectIdArray[i] = parseInt(objectIdArray[i]);
                    var tempDegree = 0;
                    if (window.allVersions[j] in window.allLattice.objects[objectIdArray[i]].highestLayerInfo)
                        tempDegree = window.allLattice.objects[objectIdArray[i]].highestLayerInfo[window.allVersions[j]];

                    if (tempDegree in histogramData)
                        histogramData[tempDegree]++;
                }
                historgramDataArray.push(histogramData);
                var tem = d3.max(Object.values(histogramData));
                if(tem > tempLargest) tempLargest = tem;
            }
        }
        window.largestDegree = tempLargest;
    }

    function drawDegreeDistribution(historgramDataArray, isDiff)
    {
        var width = d3.select("#selectionStatisticsSVG").node().getBoundingClientRect().width / 4 * (3);
        var height = 100;
        var margin = {
            left: 45,
            top: 20,
            right: 20,
            bottom: 20
        };
        var degreeNamesArray = Object.keys(historgramDataArray[0]);
        var degreeNamesArrayModified = degreeNamesArray.concat(degreeNamesArray);
        // var valueArray = 
        var x = d3.scale.ordinal()
            .domain(degreeNamesArray)
            .rangeRoundBands([margin.left, width], 0.2);



        var y = d3.scale.linear().range([height, 0 + margin.top]);
        var t1Max = d3.max(Object.values(historgramDataArray[0]));
        var t2Max = d3.max(Object.values(historgramDataArray[1]));
        // y.domain([0, d3.max(Object.values(historgramDataArray[0]))]);
        y.domain([0, d3.max([t1Max, t2Max])]);
        // y.domain([0, parseInt(d3.selectAll(".numObjects").text()) ]);


        d3.select("#selectionStatisticsSVG").selectAll("*").remove();

        if (!isDiff)
        {
            var g = d3.select("#selectionStatisticsSVG").append("g");
            var barsSelection = g.selectAll(".bar")
                .data(degreeNamesArray)
                .enter();
            var bars = barsSelection.append("rect")
                .attr("class", function(d)
                {
                    return "bar";

                })
                .attr("x", function(d)
                {
                    return x(d);
                })
                .attr("y", function(d)
                {
                    return y(historgramDataArray[0][d]);
                })
                .attr("fill", function(d)
                {
                    // var color = colors_g[allConceptNames.indexOf(d.name)];
                    // console.log(color);
                    // return color;
                    return "grey";
                })
                //   .attr("opacity", visParams.previewBarOpacity)
                .attr("opacity", 1.0)
                .attr("width", x.rangeBand())
                .attr("height", function(d)
                {
                    return height - y(historgramDataArray[0][d]);
                })
                .append("title").text(function(d)
                {
                    return "# elements: " + historgramDataArray[0][d];
                });


            var xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(-height);

            var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(2)
                .orient("left");
            g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .append("text")
                .attr("y", 26)
                .attr("x", width / 2)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("degree");
            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", height).attr("x2", width).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");

            g.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + (margin.left + 5) + ",0)")
                .call(yAxis)
                .append("text")
                // .attr("transform", "translate("+0 + ",0)")
                .attr("transform", " translate(" + (-margin.left) + ",0) rotate(-90) ")
                .attr("x", -height / 4)
                .attr("y", 3)
                .attr("dy", ".5em")
                .style("text-anchor", "end")
                .text("# elements");

            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", 0).attr("x2", margin.left).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");

            g.style("transform", "translate(0,10)");
        }
        else
        {

            // y.domain([0, d3.max(Object.values(historgramDataArray[0]))]);

            var g = d3.select("#selectionStatisticsSVG").append("g");
            var barsSelection = g.selectAll(".bar")
                .data(degreeNamesArrayModified)
                .enter();
            var bars = barsSelection.append("rect")
                .attr("class", function(d)
                {
                    return "bar ";

                })
                .attr("x", function(d, i)
                {
                    if ((i % 2) == 0)
                        return x(d);
                    else
                        // return (x(d)+((x.rangeBand)/2));
                        return x(d) + x.rangeBand() / 2 + 1;
                })
                .attr("y", function(d, i)
                {
                    if ((i % 2) == 0)
                        return y(historgramDataArray[0][d]);
                    else
                        return y(historgramDataArray[1][d]);
                })
                // return y(historgramDataArray[0][d]); })
                .attr("fill", function(d, i)
                {
                    // if((i%2) ==0)
                    //     return "url(#pattern-stripet1)";
                    // else
                    //     return "url(#pattern-stripet2)";
                    return "grey";
                })
                //   .attr("opacity", visParams.previewBarOpacity)
                .attr("opacity", 1.0)
                // .attr("stroke-width",1)
                // .attr("stroke","black")
                .attr("width", x.rangeBand() / 2)
                .attr("height", function(d, i)
                {
                    if ((i % 2) == 0)
                        return height - y(historgramDataArray[0][d]);
                    else
                        return height - y(historgramDataArray[1][d]);

                })
                .append("title").text(function(d, i)
                {
                    if ((i % 2) == 0)
                        return "# objects in " + filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "") + ": " + historgramDataArray[0][d];
                    else
                        return "# objects in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "") + ": " + historgramDataArray[1][d];
                });
            var radius = 5;



            var xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(-height);


            var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(2)
                .orient("left");
            g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .append("text")
                .attr("y", 26)
                .attr("x", width / 2)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("degree");
            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", height).attr("x2", width).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");

            g.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + (margin.left + 5) + ",0)")
                .call(yAxis)
                .append("text")
                // .attr("transform", "translate("+0 + ",0)")
                .attr("transform", " translate(" + (-margin.left) + ",0) rotate(-90) ")
                .attr("x", -height / 4)
                .attr("y", 3)
                .attr("dy", ".5em")
                .style("text-anchor", "end")
                .text("# objects");

            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", 0).attr("x2", margin.left).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");


            for (var z = 0; z < degreeNamesArrayModified.length; z++)
            {
                if (z % 2 == 0 && historgramDataArray[0][degreeNamesArrayModified[z]] > 0)
                {

                    g.append("path").attr("d", function()
                        {
                            var path = "";
                            var sweepFlag = 0;
                            path += "M -0.25," + (-radius);
                            path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                            return path;
                        }).attr("fill", "grey").attr(
                        {
                            "stroke-width": 0
                        })
                        .attr("transform", function()
                        {
                            return "translate(" + (x(degreeNamesArrayModified[z]) + (x.rangeBand() / 4)) + ", " + (y(historgramDataArray[0][degreeNamesArrayModified[z]]) - 2 * radius) + ")"
                        });

                }
                else if (z % 2 == 1 && historgramDataArray[1][degreeNamesArrayModified[z]])
                {
                    g.append("path").attr("d", function()
                        {
                            var path = "";
                            var sweepFlag = 1;
                            path += "M 0.25," + (-radius);
                            path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                            return path;
                        }).attr("fill", "grey").attr(
                        {
                            "stroke-width": 0
                        })
                        .attr("transform", function()
                        {
                            return "translate(" + (x(degreeNamesArrayModified[z]) + (3 * x.rangeBand() / 4)) + ", " + (y(historgramDataArray[1][degreeNamesArrayModified[z]]) - 2 * radius) + ")"
                        });
                }
            }
        }
    }

    function drawDegreeDistribution2(historgramDataArray, isDiff, largestDegree, historgramDataObjectsArray)
    {
        var width = d3.select("#selectionStatisticsSVG").node().getBoundingClientRect().width ;
        var height = 40 + window.NumBaseSets*2*10 ;
        var margin = {
            left: 45,
            top: 0,
            right: 30,
            bottom: 0
        };
        // console.log(height);
        var degreeNamesArray = Object.keys(historgramDataArray[0]);
        var degreeNamesArrayModified = degreeNamesArray.concat(degreeNamesArray);
        // var valueArray = 
        var y = d3.scale.ordinal()
            .domain(degreeNamesArray)
            .rangeRoundBands([ height-margin.top, margin.top], 0.4);

        var yScaleForBackground = d3.scale.ordinal()
                .domain(degreeNamesArray)
                .rangeRoundBands([ height-margin.top, margin.top], 0);



        var x = d3.scale.linear().range([0, width - margin.right -margin.left]);
        var t1Max = d3.max(Object.values(historgramDataArray[0]));
        var t2Max = d3.max(Object.values(historgramDataArray[1]));
        
        // var largestDegree = -1;

        if(window.maxObjectsInAnyDegree == undefined)
            window.maxObjectsInAnyDegree = largestDegree;
        
        if(isDiff)
            x.domain([0, d3.max([t1Max, t2Max])]);
        else
            x.domain([0, d3.max(Object.values(historgramDataArray[0]))]);


        // x.domain([0, d3.max(Object.values(historgramDataArray[0]))]);
        // x.domain([0, d3.max([t1Max, t2Max])]);
        // x.domain([0, parseInt(d3.selectAll(".numObjects").text()) ]);
        // x.domain([0, window.maxObjectsInAnyDegree ]);
        // console.log(x.domain(), x.range());

        d3.select("#selectionStatisticsSVG").selectAll("*").remove();

        if (!isDiff)
        {
            var g = d3.select("#selectionStatisticsSVG").append("g");
            var barsSelection = g.selectAll(".bar")
                .data(degreeNamesArray)
                .enter();
            // g.selectAll(".background")
            //     .data(degreeNamesArray)
            //     .enter()
            //     .append("rect")
            //     .attr({
            //         "x":margin.left,
            //         "y":function(d,i){
            //             return yScaleForBackground(d);
            //         },
            //         "width":width,
            //         "height": yScaleForBackground.rangeBand(),
            //         "fill":function(d,i){
            //             if(i%2==0)
            //                 return "#f2f2f2"
            //             else    
            //                 return "white"
            //         }
            //     });
            var bars = barsSelection.append("rect")
                .attr("class", function(d,i)
                {
                    if(window.selectedDegree!= undefined && window.selectedDegree>-1)
                        if(window.selectedDegree == d)
                            if(window.selectedType=="diff")
                                if(window.selectedDiffVersion==(i%2))
                                    return "degreeBar degreeBarSelected";
                                else
                                    return "degreeBar degreeBarDim";
                            else
                                return "degreeBar degreeBarSelected";
                        else
                            return "degreeBar degreeBarDim";
                    else
                        return "degreeBar degreeBarNormal";

                })
                .attr("x", function(d)
                {
                    // return x(d);
                    return margin.left;
                })
                .attr("y", function(d)
                {
                    return y(d);
                })
                // .attr("fill", function(d)
                // {
                //     // var color = colors_g[allConceptNames.indexOf(d.name)];
                //     // console.log(color);
                //     // return color;
                //     return "grey";
                // })
                //   .attr("opacity", visParams.previewBarOpacity)
                .attr("opacity", 1.0)
                .attr("width", function(d){ 
                    // console.log(x(historgramDataArray[0][d]));
                    return x(historgramDataArray[0][d]);
                })
                .attr("height", function(d)
                {
                    return y.rangeBand();
                }).on("click", function(d,i){
                    if(window.selectedType!="diff" && window.selectedDegree == d)
                    {

                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        // d3.select(this).attr("class","bar degreeBar degreeBarSelected");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else if (window.selectedType == "diff" && window.selectedDegree == d && window.selectedDiffVersion==(i%2) )
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        // d3.select(this).attr("class","bar degreeBar degreeBarSelected");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarDim");
                        d3.select(this).attr("class","degreeBar degreeBarSelected");
                        window.selectedDegree=d;
                        window.selectedDiffVersion = -1;
                        if(window.selectedType=="diff")
                            window.selectedDiffVersion = (i%2);

                        var filterdObjectsDict={};
                        var tempObjects=[];
                        var searchDictionary = historgramDataObjectsArray[0];
                        if(window.selectedType=="diff")
                            searchDictionary = historgramDataObjectsArray[(i%2)];
                        tempObjects = searchDictionary[d];
                        for(var t of tempObjects)
                        {
                            filterdObjectsDict[t] = 1;
                        }
                        window.objects["degree"] = filterdObjectsDict;
                        addTimestepTag(window.selectedVersions, "degree", "degree",d, (i%2));
                        
                    }
                   


                })
                // .append("title").text(function(d)
                // {
                //     return "# objects of degree "+d+" : " + historgramDataArray[0][d];
                // });
                .attr("title", function(d)
                {
                    var timestepString = " in all timesteps.";
                    if(window.selectedVersions.length ==1)
                    {
                        timestepString = " in "+filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "")
                    }
                    // return "Among "+d3.select("#selectedNumObjects").text()+" selected elements,there are "+historgramDataArray[0][d]+" objects of degree "+d;
                    var titleStr = "";
                    if(parseInt(d3.select("#selectedNumObjects").text()) == historgramDataArray[0][d])
                        titleStr = "All "+d3.select("#selectedNumObjects").text()+" selected elements, are present ";
                    else
                        titleStr =  "Among "+d3.select("#selectedNumObjects").text()+" selected elements, "+historgramDataArray[0][d] + " objects of degree "+d+" are present ";
                    return titleStr+timestepString;
                    // return "# objects of degree "+d+" : " + historgramDataArray[0][d];
                });
                d3.selectAll(".degreeBar").on("mouseout", function(){
                    d3.selectAll(".ui-tooltip").remove();
    
                })
                $('.degreeBar').tooltip( {track:true, delay: { "show": 0, "hide": 0}});


            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(4);
                // .tickSize(-height);
            
            var tickValues = [0,Math.floor(window.maxObjectsInAnyDegree/2),window.maxObjectsInAnyDegree];
            for(var b=0; b<tickValues.length; b++)
            {
                g.append("text").text(tickValues[b]).attr({
                    "y":height+20,
                    "x":margin.left + x(tickValues[b])-5,
                    "fill":"black",
                    "class":"x axis"
                });
                g.append("line").attr({
                    "y1":height,
                    "x1":margin.left + x(tickValues[b]),
                    "y2":height+5,
                    "x2":margin.left + x(tickValues[b]),
                    "stroke":"black",
                    "class":"x axis"
                });
            }

            var yAxis = d3.svg.axis()
                .scale(y)
                // .ticks(4)
                .orient("left");
            // g.append("g")
            //     .attr("class", "x axis")
            //     .attr("transform", "translate("+margin.left+"," + height + ")")
            //     .call(xAxis)
            //     .append("text")
            //     .attr("y", 26)
            //     .attr("x", width / 3)
            //     .attr("dy", ".5em")
            //     .style("text-anchor", "middle")
            //     .text("# objects");
            // g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", height).attr("x2", width-margin.right).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");
            g.append("text")
                .attr("y", height+20)
                .attr("x", margin.left + 20)
                .attr("dy", ".5em")
                .style("text-anchor", "left")
                .text("# objects")
                .attr("class", "axisLabel");


            g.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + (margin.left + 5) + ",0)")
                .call(yAxis);
                
            g.append("text")
                // .attr("transform", "translate("+0 + ",0)")
                .attr("x",0)
                .attr("y", 0)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("degree")
                .attr("transform", " translate(" + (5) + ","+(height/2)+") rotate(-90) ")
                .attr("class", "axisLabel");


            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", 0).attr("x2", margin.left).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");
            
            g.style("transform", "translate(0,10)");
        }
        else
        {

            // y.domain([0, d3.max(Object.values(historgramDataArray[0]))]);

            var g = d3.select("#selectionStatisticsSVG").append("g");
            var barsSelection = g.selectAll(".bar")
                .data(degreeNamesArrayModified)
                .enter();
            var bars = barsSelection.append("rect")
                .attr("class", function(d,i)
                {
                    if(window.selectedDegree!= undefined && window.selectedDegree>-1)
                        if(window.selectedDegree == d)
                            if(window.selectedType=="diff")
                                if(window.selectedDiffVersion==(i%2))
                                    return "degreeBar degreeBarSelected";
                                else
                                    return "degreeBar degreeBarDim";
                            else
                                return "degreeBar degreeBarSelected";
                        else
                            return "degreeBar degreeBarDim";
                    else
                        return "degreeBar degreeBarNormal";

                })
                .attr("x", function(d, i)
                {
                    // if ((i % 2) == 0)
                    //     return x(d);
                        
                    // else
                    //     // return (x(d)+((x.rangeBand)/2));
                    //     return x(d) + x.rangeBand() / 2 + 1;
                    return margin.left;
                })
                .attr("y", function(d, i)
                {
                    if ((i < degreeNamesArrayModified.length/2))
                        return y(d);
                    else
                        return y(d) + y.rangeBand() / 2 + 1;
                })
                // return y(historgramDataArray[0][d]); })
                .attr("fill", function(d, i)
                {
                    // if((i%2) ==0)
                    //     return "url(#pattern-stripet1)";
                    // else
                    //     return "url(#pattern-stripet2)";
                    return "grey";
                })
                //   .attr("opacity", visParams.previewBarOpacity)
                .attr("opacity", 1.0)
                // .attr("stroke-width",1)
                // .attr("stroke","black")
                .attr("width", function(d,i)
                {
                    // x.rangeBand() / 2)
                    d = parseInt(d);
                    var w = 0;
                    if ((i < degreeNamesArrayModified.length/2))
                        w =  x(historgramDataArray[0][d]);
                    else
                        w =  x(historgramDataArray[1][d]);
                    return w;
                })
                .attr("height", function(d, i)
                {
                    return y.rangeBand() / 2;

                }).on("click", function(d,i){
                    if(window.selectedType!="diff" && window.selectedDegree == d)
                    {

                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else if (window.selectedType == "diff" && window.selectedDegree == d && window.selectedDiffVersion==(i%2) )
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        // d3.select(this).attr("class","bar degreeBar degreeBarSelected");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarDim");
                        d3.select(this).attr("class","degreeBar degreeBarSelected");
                        window.selectedDegree=d;
                        window.selectedDiffVersion = -1;
                        if(window.selectedType=="diff")
                            window.selectedDiffVersion = (i%2);

                        var filterdObjectsDict={};
                        var tempObjects=[];
                        var searchDictionary = historgramDataObjectsArray[0];
                        if(window.selectedType=="diff")
                            searchDictionary = historgramDataObjectsArray[(i%2)];
                        tempObjects = searchDictionary[d];
                        for(var t of tempObjects)
                        {
                            filterdObjectsDict[t] = 1;
                        }
                        window.objects["degree"] = filterdObjectsDict;
                        addTimestepTag(window.selectedVersions, "degree", "degree",d, (i%2));
                        
                    }

                })
                // .append("title").text(function(d, i)
                // {
                //     if ((i % 2) == 0)
                //         return "# objects of degree "+d+" in " + filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "") + ": " + historgramDataArray[0][d];
                //     else
                //         return "# objects of degree "+d+" in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "") + ": " + historgramDataArray[1][d];
                // });
                .attr("title", function(d, i)
                {
                    if ((i % 2) == 0)
                        return "Among "+d3.select("#selectedNumObjects").text()+" selected elements, there are "+ historgramDataArray[0][d]+" objects of degree "+d+" present in " + filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "");
                    else
                        return "Among "+d3.select("#selectedNumObjects").text()+" selected elements, there are "+ historgramDataArray[1][d]+" objects of degree "+d+" present in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "");

                        // return "# objects of degree "+d+" in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "") + ": " + historgramDataArray[1][d];
                });
                d3.selectAll(".degreeBar").on("mouseout", function(){
                    d3.selectAll(".ui-tooltip").remove();
    
                })
                $('.degreeBar').tooltip( {track:true, delay: { "show": 0, "hide": 0}});
                
            var radius = 5;



            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(4);
                

                // .tickSize(-height);


            var yAxis = d3.svg.axis()
                .scale(y)
                // .ticks(2)
                .orient("left");

            g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate("+margin.left+"," + height + ")")                
                .call(xAxis)
                .append("text")
                .attr("y", 26)
                .attr("x", width / 3)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("# objects");
            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", height).attr("x2", width).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");

            g.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + (margin.left + 5) + ",0)")
                .call(yAxis);
            g.append("text")
                // .attr("transform", "translate("+0 + ",0)")
                .attr("x",0)
                .attr("y", 0)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("degree")
                .attr("transform", " translate(" + (5) + ","+(height/2)+") rotate(-90) ")
                .attr("class", "axisLabel");

            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", 0).attr("x2", margin.left).attr("y2", height).attr("style", "stroke:black;stroke-width:1px;");


            // for (var z = 0; z < degreeNamesArrayModified.length; z++)
            // {
            //     if (z % 2 == 0 && historgramDataArray[0][degreeNamesArrayModified[z]] > 0)
            //     {

            //         // g.append("path").attr("d", function()
            //         //     {
            //         //         var path = "";
            //         //         var sweepFlag = 0;
            //         //         path += "M -0.25," + (-radius);
            //         //         path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
            //         //         return path;
            //         //     }).attr("fill", "grey").attr(
            //         //     {
            //         //         "stroke-width": 0
            //         //     })
            //         //     .attr("transform", function()
            //         //     {
            //         //         return "translate(" + (margin.left+ x(historgramDataArray[0][degreeNamesArrayModified[z]]) + 2 * radius) + ", " + (y(degreeNamesArrayModified[z]) + (y.rangeBand() / 4)) + ")"
            //         //     });
            //         g.append("text")
            //             .attr("x",0)
            //             .attr("y",0)
            //             .attr("font-size","12px")
            //             .attr("dominant-baseline","central")
            //             .attr("text-anchor",function(){
            //                 if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                     return "middle";
            //                 else
            //                     return "start";
            //             })
            //             .attr("fill",function(d,i)
            //             {
            //                 if(x(historgramDataArray[0][degreeNamesArrayModified[z]]) >100)
            //                     return "white";
            //                 else
            //                     return "black";
            //             })
            //             .text("in "+filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", ""))
            //             .attr("transform", function()
            //             {
            //                 var xpos=0;
            //                 if(x(historgramDataArray[0][degreeNamesArrayModified[z]]) >100)
            //                     xpos = (margin.left+x(historgramDataArray[0][degreeNamesArrayModified[z]]))/2;
            //                 else
            //                     xpos = margin.left+ x(historgramDataArray[0][degreeNamesArrayModified[z]]);

            //                 return "translate(" + (xpos +  radius) + ", " + (y(degreeNamesArrayModified[z]) + (y.rangeBand() / 4)) + ")"
            //             });

            //     }
            //     else if (z % 2 == 1 && historgramDataArray[1][degreeNamesArrayModified[z]])
            //     {
            //         // g.append("path").attr("d", function()
            //         //     {
            //         //         var path = "";
            //         //         var sweepFlag = 1;
            //         //         path += "M 0.25," + (-radius);
            //         //         path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
            //         //         return path;
            //         //     }).attr("fill", "grey").attr(
            //         //     {
            //         //         "stroke-width": 0
            //         //     })
            //         //     .attr("transform", function()
            //         //     {
            //         //         // return "translate(" + (x(degreeNamesArrayModified[z]) + (3 * x.rangeBand() / 4)) + ", " + (y(historgramDataArray[1][degreeNamesArrayModified[z]]) - 2 * radius) + ")"
            //         //         return "translate(" + (margin.left+ x(historgramDataArray[1][degreeNamesArrayModified[z]]) + radius) + ", " + (y(degreeNamesArrayModified[z]) + (3*(y.rangeBand() / 4))) + ")"

            //         //     });

            //         g.append("text")
            //         .attr("x",0)
            //         .attr("y",0)
            //         .attr("font-size","12px")
            //         .attr("dominant-baseline","central")
            //         .attr("text-anchor",function(){
            //             if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                 return "middle";
            //             else
            //                 return "start";
            //         })
            //         .attr("fill",function(d,i)
            //         {
            //             if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                 return "white";
            //             else
            //                 return "black";
            //         })
            //         .text("in "+filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", ""))
            //         .attr("transform", function()
            //         {
            //             var xpos=0;
            //             if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                 xpos = (margin.left+x(historgramDataArray[1][degreeNamesArrayModified[z]]))/2;
            //             else
            //                 xpos = margin.left+ x(historgramDataArray[1][degreeNamesArrayModified[z]]);

            //                 return "translate(" + (xpos + radius) + ", " + (y(degreeNamesArrayModified[z]) + ( y.rangeBand() / 2 + 6)) + ")"
                        
            //         });
                        
            //     }
            // }
        }
        var h = d3.select("#selectionStatisticsSVG g").node().getBoundingClientRect().height;
        d3.select("#selectionStatisticsSVG").attr("height", h);

    }

    function drawDegreeDistribution3(historgramDataArray, isDiff, largestDegree, historgramDataObjectsArray)
    {
        var width = d3.select("#selectionStatisticsSVG").node().getBoundingClientRect().width ;
        var height = 40 + window.NumBaseSets*2*10 ;
        var margin = {
            left: 45,
            top: 10,
            right: 10,
            bottom: 0
        };
        // console.log(height);
        var degreeNamesArray = Object.keys(historgramDataArray[0]);
        var degreeNamesArrayModified = degreeNamesArray.concat(degreeNamesArray);
        // var valueArray = 
        var x = d3.scale.ordinal()
            .domain(degreeNamesArray)
            .rangeRoundBands([ margin.left, width-margin.right], 0.4);

        var yScaleForBackground = d3.scale.ordinal()
                .domain(degreeNamesArray)
                .rangeRoundBands([ height-margin.top, margin.top], 0);



        var y = d3.scale.linear().range([0, height - margin.top -margin.bottom]);
        var t1Max = d3.max(Object.values(historgramDataArray[0]));
        var t2Max = d3.max(Object.values(historgramDataArray[1]));
        
        // var largestDegree = -1;

        if(window.maxObjectsInAnyDegree == undefined)
            window.maxObjectsInAnyDegree = largestDegree;
        
        if(isDiff){
            window.maxObjectsInAnyDegree = d3.max([t1Max, t2Max]);
        }
        else
            window.maxObjectsInAnyDegree =d3.max(Object.values(historgramDataArray[0]));
        
        y.domain([0, window.maxObjectsInAnyDegree]);


        // x.domain([0, d3.max(Object.values(historgramDataArray[0]))]);
        // x.domain([0, d3.max([t1Max, t2Max])]);
        // x.domain([0, parseInt(d3.selectAll(".numObjects").text()) ]);
        // x.domain([0, window.maxObjectsInAnyDegree ]);
        // console.log(x.domain(), x.range());

        d3.select("#selectionStatisticsSVG").selectAll("*").remove();

        if (!isDiff)
        {
            var g = d3.select("#selectionStatisticsSVG").append("g");
            var barsSelection = g.selectAll(".bar")
                .data(degreeNamesArray)
                .enter();
            // g.selectAll(".background")
            //     .data(degreeNamesArray)
            //     .enter()
            //     .append("rect")
            //     .attr({
            //         "x":margin.left,
            //         "y":function(d,i){
            //             return yScaleForBackground(d);
            //         },
            //         "width":width,
            //         "height": yScaleForBackground.rangeBand(),
            //         "fill":function(d,i){
            //             if(i%2==0)
            //                 return "#f2f2f2"
            //             else    
            //                 return "white"
            //         }
            //     });
            var bars = barsSelection.append("rect")
                .attr("class", function(d,i)
                {
                    if(window.selectedDegree!= undefined && window.selectedDegree>-1)
                        if(window.selectedDegree == d)
                            if(window.selectedType=="diff")
                                if(window.selectedDiffVersion==(i%2))
                                    return "degreeBar degreeBarSelected";
                                else
                                    return "degreeBar degreeBarDim";
                            else
                                return "degreeBar degreeBarSelected";
                        else
                            return "degreeBar degreeBarDim";
                    else
                        return "degreeBar degreeBarNormal";

                })
                .attr("x", function(d)
                {
                    return x(d);
                    // return margin.left;
                })
                .attr("y", function(d)
                {
                    // return y(d);
                    return height-margin.bottom - y(historgramDataArray[0][d]);
                })
                // .attr("fill", function(d)
                // {
                //     // var color = colors_g[allConceptNames.indexOf(d.name)];
                //     // console.log(color);
                //     // return color;
                //     return "grey";
                // })
                //   .attr("opacity", visParams.previewBarOpacity)
                .attr("opacity", 1.0)
                .attr("height", function(d){ 
                    // console.log(x(historgramDataArray[0][d]));
                    return y(historgramDataArray[0][d]);
                })
                .attr("width", function(d)
                {
                    return x.rangeBand();
                }).on("click", function(d,i){
                    if(window.selectedType!="diff" && window.selectedDegree == d)
                    {

                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        // d3.select(this).attr("class","bar degreeBar degreeBarSelected");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else if (window.selectedType == "diff" && window.selectedDegree == d && window.selectedDiffVersion==(i%2) )
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        // d3.select(this).attr("class","bar degreeBar degreeBarSelected");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarDim");
                        d3.select(this).attr("class","degreeBar degreeBarSelected");
                        window.selectedDegree=d;
                        window.selectedDiffVersion = -1;
                        if(window.selectedType=="diff")
                            window.selectedDiffVersion = (i%2);

                        var filterdObjectsDict={};
                        var tempObjects=[];
                        var searchDictionary = historgramDataObjectsArray[0];
                        if(window.selectedType=="diff")
                            searchDictionary = historgramDataObjectsArray[(i%2)];
                        tempObjects = searchDictionary[d];
                        for(var t of tempObjects)
                        {
                            filterdObjectsDict[t] = 1;
                        }
                        window.objects["degree"] = filterdObjectsDict;
                        addTimestepTag(window.selectedVersions, "degree", "degree",d, (i%2));
                        
                    }
                   


                })
                // .append("title").text(function(d)
                // {
                //     return "# objects of degree "+d+" : " + historgramDataArray[0][d];
                // });
                .attr("title", function(d)
                {
                    var timestepString = " in all timesteps.";
                    if(window.selectedVersions.length ==1)
                    {
                        timestepString = " in "+filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "")
                    }
                    // return "Among "+d3.select("#selectedNumObjects").text()+" selected elements,there are "+historgramDataArray[0][d]+" objects of degree "+d;
                    var titleStr = "";
                    if(parseInt(d3.select("#selectedNumObjects").text()) == historgramDataArray[0][d])
                        titleStr = "All "+d3.select("#selectedNumObjects").text()+" selected elements, are present ";
                    else
                        titleStr =  "Among "+d3.select("#selectedNumObjects").text()+" selected elements, "+historgramDataArray[0][d] + " objects of degree "+d+" are present ";
                    return titleStr+timestepString;
                    // return "# objects of degree "+d+" : " + historgramDataArray[0][d];
                });
                d3.selectAll(".degreeBar").on("mouseout", function(){
                    d3.selectAll(".ui-tooltip").remove();
    
                })
                $('.degreeBar').tooltip( {track:true, delay: { "show": 0, "hide": 0}});


            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left");
                
                // .tickSize(-height);
            
            var tickValues = [0,Math.floor(window.maxObjectsInAnyDegree/2),window.maxObjectsInAnyDegree];
            for(var b=0; b<tickValues.length; b++)
            {
                g.append("text").text(tickValues[b]).attr({
                    // "y":height+20,
                    "y":height-y(tickValues[b])+4,
                    // "x":margin.left + x(tickValues[b])-5,
                    "x":margin.left-7,
                    "fill":"black",
                    "class":"y axis",
                    "text-anchor":"end"
                });
                g.append("line")
                .attr("x1", margin.left-5)
                .attr("y1", height-y(tickValues[b]))
                .attr("x2", margin.left)
                .attr("y2", height-y(tickValues[b]))
                .attr("style", "stroke:black;stroke-width:1px;");
                
               
            }


            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(4);

                g.append("line")
                    .attr("x1", margin.left)
                    .attr("y1", height)
                    .attr("x2", width-margin.right)
                    .attr("y2", height)
                    .attr("style", "stroke:black;stroke-width:1px;");

                // .orient("left");
            // g.append("g")
            //     .attr("class", "x axis")
            //     .attr("transform", "translate("+margin.left+"," + height + ")")
            //     .call(xAxis)
            //     .append("text")
            //     .attr("y", 26)
            //     .attr("x", width / 3)
            //     .attr("dy", ".5em")
            //     .style("text-anchor", "middle")
            //     .text("# objects");
            // g.select("path").remove();
            // g.append("line").attr({
            //     "y1":height,
            //     "x1":margin.left + y(tickValues[b]),
            //     "y2":height+5,
            //     "x2":margin.left + y(tickValues[b]),
            //     "stroke":"black",
            //     "class":"x axis"
            // });
            g.append("text")
                .attr("y", height+20)
                .attr("x", margin.left + 20)
                .attr("dy", ".5em")
                .style("text-anchor", "right")
                .text("degree")
                .attr("class", "axisLabel");


            g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(" + (0) + ","+(height-5)+")")
                .call(xAxis);
                
            g.append("text")
                // .attr("transform", "translate("+0 + ",0)")
                .attr("x",0)
                .attr("y", 0)
                .attr("dy", ".5em")
                .style("text-anchor", "middle")
                .text("# objects")
                .attr("transform", " translate(" + (5) + ","+(height/2)+") rotate(-90) ")
                .attr("class", "axisLabel");


            g.select("path").remove();
            g.append("line").attr("x1", margin.left).attr("y1", 0).attr("x2", margin.left).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");
            
            g.style("transform", "translate(0,10)");
        }
        else
        {

            // y.domain([0, d3.max(Object.values(historgramDataArray[0]))]);

            var g = d3.select("#selectionStatisticsSVG").append("g");
            var barsSelection = g.selectAll(".bar")
                .data(degreeNamesArrayModified)
                .enter();
            var bars = barsSelection.append("rect")
                .attr("class", function(d,i)
                {
                    if(window.selectedDegree!= undefined && window.selectedDegree>-1)
                        if(window.selectedDegree == d)
                            if(window.selectedType=="diff")
                                if(window.selectedDiffVersion==(i%2))
                                    return "degreeBar degreeBarSelected";
                                else
                                    return "degreeBar degreeBarDim";
                            else
                                return "degreeBar degreeBarSelected";
                        else
                            return "degreeBar degreeBarDim";
                    else
                        return "degreeBar degreeBarNormal";

                })
                .attr("x", function(d, i)
                {
                    if ((i < degreeNamesArrayModified.length/2))
                        return x(d);
                        
                    else
                        // return (x(d)+((x.rangeBand)/2));
                        return x(d) + x.rangeBand() / 2 + 1;
                    // return margin.left;
                })
                .attr("y", function(d, i)
                {
                    // if ((i < degreeNamesArrayModified.length/2))
                    //     return y(d);
                    // else
                    //     return y(d) + y.rangeBand() / 2 + 1;
                    d = parseInt(d);
                    var w = 0;
                    if ((i < degreeNamesArrayModified.length/2))
                        w =  y(historgramDataArray[0][d]);
                    else
                        w =  y(historgramDataArray[1][d]);
                    // return w;

                    return height-margin.bottom-w;
                })
                // return y(historgramDataArray[0][d]); })
                .attr("fill", function(d, i)
                {
                    // if((i%2) ==0)
                    //     return "url(#pattern-stripet1)";
                    // else
                    //     return "url(#pattern-stripet2)";
                    return "grey";
                })
                //   .attr("opacity", visParams.previewBarOpacity)
                .attr("opacity", 1.0)
                // .attr("stroke-width",1)
                // .attr("stroke","black")
                .attr("height", function(d,i)
                {
                    // x.rangeBand() / 2)
                    d = parseInt(d);
                    var w = 0;
                    if ((i < degreeNamesArrayModified.length/2))
                        w =  y(historgramDataArray[0][d]);
                    else
                        w =  y(historgramDataArray[1][d]);
                    return w;
                })
                .attr("width", function(d, i)
                {
                    return x.rangeBand() / 2;

                }).on("click", function(d,i){
                    if(window.selectedType!="diff" && window.selectedDegree == d)
                    {

                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else if (window.selectedType == "diff" && window.selectedDegree == d && window.selectedDiffVersion==(i%2) )
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarNormal");
                        // d3.select(this).attr("class","bar degreeBar degreeBarSelected");
                        window.selectedDegree=-1;
                        window.selectedDiffVersion = -1;

                        delete window.objects["degree"];
                        updateListWithCurrentSelection();
                        d3.select(".degree").remove();
                    }
                    else
                    {
                        d3.selectAll(".degreeBar").attr("class","degreeBar degreeBarDim");
                        d3.select(this).attr("class","degreeBar degreeBarSelected");
                        window.selectedDegree=d;
                        window.selectedDiffVersion = -1;
                        if(window.selectedType=="diff")
                            window.selectedDiffVersion = (i%2);

                        var filterdObjectsDict={};
                        var tempObjects=[];
                        var searchDictionary = historgramDataObjectsArray[0];
                        if(window.selectedType=="diff")
                            searchDictionary = historgramDataObjectsArray[(i%2)];
                        tempObjects = searchDictionary[d];
                        for(var t of tempObjects)
                        {
                            filterdObjectsDict[t] = 1;
                        }
                        window.objects["degree"] = filterdObjectsDict;
                        addTimestepTag(window.selectedVersions, "degree", "degree",d, (i%2));
                        
                    }

                })
                // .append("title").text(function(d, i)
                // {
                //     if ((i % 2) == 0)
                //         return "# objects of degree "+d+" in " + filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "") + ": " + historgramDataArray[0][d];
                //     else
                //         return "# objects of degree "+d+" in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "") + ": " + historgramDataArray[1][d];
                // });
                .attr("title", function(d, i)
                {
                    if ((i % 2) == 0)
                        return "Among "+d3.select("#selectedNumObjects").text()+" selected elements, there are "+ historgramDataArray[0][d]+" objects of degree "+d+" present in " + filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", "");
                    else
                        return "Among "+d3.select("#selectedNumObjects").text()+" selected elements, there are "+ historgramDataArray[1][d]+" objects of degree "+d+" present in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "");

                        // return "# objects of degree "+d+" in " + filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", "") + ": " + historgramDataArray[1][d];
                });
                d3.selectAll(".degreeBar").on("mouseout", function(){
                    d3.selectAll(".ui-tooltip").remove();
    
                })
                $('.degreeBar').tooltip( {track:true, delay: { "show": 0, "hide": 0}});
                
            var radius = 5;

            var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");
            
            // .tickSize(-height);
        
        var tickValues = [0,Math.floor(window.maxObjectsInAnyDegree/2),window.maxObjectsInAnyDegree];
        for(var b=0; b<tickValues.length; b++)
        {
            g.append("text").text(tickValues[b]).attr({
                // "y":height+20,
                "y":height-y(tickValues[b])+4,
                // "x":margin.left + x(tickValues[b])-5,
                "x":margin.left-7,
                "fill":"black",
                "class":"y axis",
                "text-anchor":"end"
            });
            g.append("line")
            .attr("x1", margin.left-5)
            .attr("y1", height-y(tickValues[b]))
            .attr("x2", margin.left)
            .attr("y2", height-y(tickValues[b]))
            .attr("style", "stroke:black;stroke-width:1px;");
            
           
        }


        var xAxis = d3.svg.axis()
            .scale(x)
            .ticks(4);

            for(var i=0; i<degreeNamesArrayModified.length/2;i++)
            {
                g.append("rect").attr({
                    "fill": "none",
                    "stroke":"grey",
                    "stroke-width":"1px",
                    "x":x(degreeNamesArrayModified[i]),
                    "y": margin.top,
                    "width": x.rangeBand,
                    "height": height-margin.top-margin.bottom
                });
            }

            g.append("line")
                .attr("x1", margin.left)
                .attr("y1", height)
                .attr("x2", width-margin.right)
                .attr("y2", height)
                .attr("style", "stroke:black;stroke-width:1px;");

            // .orient("left");
        // g.append("g")
        //     .attr("class", "x axis")
        //     .attr("transform", "translate("+margin.left+"," + height + ")")
        //     .call(xAxis)
        //     .append("text")
        //     .attr("y", 26)
        //     .attr("x", width / 3)
        //     .attr("dy", ".5em")
        //     .style("text-anchor", "middle")
        //     .text("# objects");
        // g.select("path").remove();
        // g.append("line").attr({
        //     "y1":height,
        //     "x1":margin.left + y(tickValues[b]),
        //     "y2":height+5,
        //     "x2":margin.left + y(tickValues[b]),
        //     "stroke":"black",
        //     "class":"x axis"
        // });
        g.append("text")
            .attr("y", height+20)
            .attr("x", margin.left + 20)
            .attr("dy", ".5em")
            .style("text-anchor", "right")
            .text("degree")
            .attr("class", "axisLabel");


        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + (0) + ","+(height-5)+")")
            .call(xAxis);
            
        g.append("text")
            // .attr("transform", "translate("+0 + ",0)")
            .attr("x",0)
            .attr("y", 0)
            .attr("dy", ".5em")
            .style("text-anchor", "middle")
            .text("# objects")
            .attr("transform", " translate(" + (5) + ","+(height/2)+") rotate(-90) ")
            .attr("class", "axisLabel");


        g.select("path").remove();
        g.append("line").attr("x1", margin.left).attr("y1", 0).attr("x2", margin.left).attr("y2", height-margin.bottom).attr("style", "stroke:black;stroke-width:1px;");
        
        g.style("transform", "translate(0,10)");

            
            // for (var z = 0; z < degreeNamesArrayModified.length; z++)
            // {
            //     if (z % 2 == 0 && historgramDataArray[0][degreeNamesArrayModified[z]] > 0)
            //     {

            //         // g.append("path").attr("d", function()
            //         //     {
            //         //         var path = "";
            //         //         var sweepFlag = 0;
            //         //         path += "M -0.25," + (-radius);
            //         //         path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
            //         //         return path;
            //         //     }).attr("fill", "grey").attr(
            //         //     {
            //         //         "stroke-width": 0
            //         //     })
            //         //     .attr("transform", function()
            //         //     {
            //         //         return "translate(" + (margin.left+ x(historgramDataArray[0][degreeNamesArrayModified[z]]) + 2 * radius) + ", " + (y(degreeNamesArrayModified[z]) + (y.rangeBand() / 4)) + ")"
            //         //     });
            //         g.append("text")
            //             .attr("x",0)
            //             .attr("y",0)
            //             .attr("font-size","12px")
            //             .attr("dominant-baseline","central")
            //             .attr("text-anchor",function(){
            //                 if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                     return "middle";
            //                 else
            //                     return "start";
            //             })
            //             .attr("fill",function(d,i)
            //             {
            //                 if(x(historgramDataArray[0][degreeNamesArrayModified[z]]) >100)
            //                     return "white";
            //                 else
            //                     return "black";
            //             })
            //             .text("in "+filenames[window.allVersions.indexOf(window.selectedVersions[0])].replace(".csv", ""))
            //             .attr("transform", function()
            //             {
            //                 var xpos=0;
            //                 if(x(historgramDataArray[0][degreeNamesArrayModified[z]]) >100)
            //                     xpos = (margin.left+x(historgramDataArray[0][degreeNamesArrayModified[z]]))/2;
            //                 else
            //                     xpos = margin.left+ x(historgramDataArray[0][degreeNamesArrayModified[z]]);

            //                 return "translate(" + (xpos +  radius) + ", " + (y(degreeNamesArrayModified[z]) + (y.rangeBand() / 4)) + ")"
            //             });

            //     }
            //     else if (z % 2 == 1 && historgramDataArray[1][degreeNamesArrayModified[z]])
            //     {
            //         // g.append("path").attr("d", function()
            //         //     {
            //         //         var path = "";
            //         //         var sweepFlag = 1;
            //         //         path += "M 0.25," + (-radius);
            //         //         path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
            //         //         return path;
            //         //     }).attr("fill", "grey").attr(
            //         //     {
            //         //         "stroke-width": 0
            //         //     })
            //         //     .attr("transform", function()
            //         //     {
            //         //         // return "translate(" + (x(degreeNamesArrayModified[z]) + (3 * x.rangeBand() / 4)) + ", " + (y(historgramDataArray[1][degreeNamesArrayModified[z]]) - 2 * radius) + ")"
            //         //         return "translate(" + (margin.left+ x(historgramDataArray[1][degreeNamesArrayModified[z]]) + radius) + ", " + (y(degreeNamesArrayModified[z]) + (3*(y.rangeBand() / 4))) + ")"

            //         //     });

            //         g.append("text")
            //         .attr("x",0)
            //         .attr("y",0)
            //         .attr("font-size","12px")
            //         .attr("dominant-baseline","central")
            //         .attr("text-anchor",function(){
            //             if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                 return "middle";
            //             else
            //                 return "start";
            //         })
            //         .attr("fill",function(d,i)
            //         {
            //             if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                 return "white";
            //             else
            //                 return "black";
            //         })
            //         .text("in "+filenames[window.allVersions.indexOf(window.selectedVersions[1])].replace(".csv", ""))
            //         .attr("transform", function()
            //         {
            //             var xpos=0;
            //             if(x(historgramDataArray[1][degreeNamesArrayModified[z]]) >100)
            //                 xpos = (margin.left+x(historgramDataArray[1][degreeNamesArrayModified[z]]))/2;
            //             else
            //                 xpos = margin.left+ x(historgramDataArray[1][degreeNamesArrayModified[z]]);

            //                 return "translate(" + (xpos + radius) + ", " + (y(degreeNamesArrayModified[z]) + ( y.rangeBand() / 2 + 6)) + ")"
                        
            //         });
                        
            //     }
            // }
        }
        var h = d3.select("#selectionStatisticsSVG g").node().getBoundingClientRect().height;
        d3.select("#selectionStatisticsSVG").attr("height", h);

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
        // d3.select("#diffPreviewContainerRow").append("div").attr("style","float:left;width:20px;height:"+guiParams.previewHeight+"px;");

        var navigationContainer = d3.select("#diffPreviewContainerRow").attr("style", "padding-left:30px;");
        // navigationContainer.append("div").attr("style","float:left;width:20px;height:"+guiParams.previewHeight+"px;");
        var diffPreviewsContainer = navigationContainer.append("div").attr("id", "diffPreviewContainer").attr("class", "navigationRow");
        var versionPreviewsContainer = d3.select("#individualVersionRow").append("div").attr("class", "navigationRow");

        d3.select("#individualVersionRow div").append("div").attr("id","navigationLegend").attr("style","float:left;width:30px;height:"+guiParams.previewHeight+"px;");
        
        

        // Create the selection bar.
        // var selectionBarContainer = navigationContainer.append("div").attr("id", "selectionBar");
        var selectionBarContainer = d3.select("#selectionBar").attr("style", "padding-left:30px;");
        var selectionBar = constructSelectionBar(selectionBarContainer, versions, versionLabels, function(selectedVersions)
        {
            // If user selects nothing, navigate to aggregation of all versions.
            if (selectedVersions.length > 0) navigateCallback(selectedVersions, "aggregate");
            else navigateCallback(versions, "aggregate")
        });
        // Handle arrow keys navigation.
        window.navigateNext = null;
        window.navigatePrev = null;
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
        window.navigateCallbackWrapper = function(versionsChoice, type)
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

            if (type != "ctrl")
                navigateCallback(versionsChoice, type);


            if (type == "diff")
            {
                addTimestepTag(versions, "diff", "timestep");
            }
            else if (type == "aggregate" && versionsChoice.length == 1)
            {
                addTimestepTag(versions, "individual", "timestep");
            }
            else
            {
                addTimestepTag(versions, "aggregate", "timestep");
                d3.selectAll(".svgContainer.preview").classed("divSelected", false);


            }

            showExclusiveMembership();

            // Needs to update objects in currently selected concepts and moved objects
            for(var k=0; k<window.selectedConceptIdForHighlight.length; k++)
            highlightBars(window.selectedConceptIdForHighlight[k], window.selectedVersions);

            updateListWithCurrentSelection();
            


        };
        // Create the 'Aggregate all' button.
        d3.select("#buttonPanel").append("input").attr(
            {
                value: "Aggregate all timesteps",
                type: "button"
            })
            // d3.select("#buttonPanel").append("button").attr(
            //     {
            //         // value: "Aggregate all timesteps",
            //         type: "button",
            //         class: "btn btn-primary"
            //     }).text("Aggregate all timesteps")
            .on("click", function(e)
            {
                navigateCallbackWrapper(versions, "aggregate");
                var aggregateString = "Aggregated view of all timesteps";
                d3.select("#svgTextConsole").text(aggregateString);
            });
        // By default, select all versions on the bar.
        selectionBar.setSelectionToVersions(versions);
        var listOfDiffObjects = [];
        // Create a 'version' and a 'diff' preview for each version.
        for (var i = 0; i < versions.length; i++)
        {
            var version = versions[i];
            var versionPreviewDiv = versionPreviewsContainer.append("div").classed("svgContainer preview", true);
            var versionPreviewCanvas = versionPreviewDiv.append("svg");
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

            versionPreviewCanvas.on("mousedown", function()
            {
                // window.handleBarClick = false;
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
                    // if(window.handleBarClick == false)
                    {
                        d3.selectAll(".svgContainer.preview").classed("divSelected", false);
                        // console.log(window.selectedConceptIdForHighlight);
                        // if(window.selectedConceptIdForHighlight<=0)
                        // {
                        //     d3.select(".conceptSelection").remove();
                        //     // window.selectedConceptIdForHighlight = -1;
                        //     mainVisualization.focusedConcept = null;
                        //     d3.selectAll("rect.border").attr("style","stroke-opacity:0;");

                        //     delete window.objects["conceptSelection"];
                        //     updateListWithCurrentSelection();
                        // }
                        if (d3.event.ctrlKey)
                        {
                            if (window.count == 0)
                            {
                                window.count = 1;
                                window.diffVersionArray = versionsLocal.slice();
                                navigateCallbackWrapper(diffVersionArray, "ctrl");


                            }
                            else if (window.count == 1)
                            {
                                window.count = 0;
                                window.diffVersionArray.push(versionsLocal[0]);
                                diffVersionArray.sort(function(a, b)
                                {
                                    return a - b
                                });
                                // destroyhighlightSelectedPreviewForDiff(diffVersionArray[0]);

                                navigateCallbackWrapper(diffVersionArray, "diff");

                            }


                            // console.log(diffVersionArray);
                        }
                        else
                            navigateCallbackWrapper(versionsLocal, "aggregate");
                    }
                };

            })([version]));
            // Create a 'diff' preview.
            if (i < versions.length - 1)
            {
                var nextVersion = versions[i + 1];
                var numofObjectsInPreviousTimeOnly = 0;
                var numofObjectsInNextTimeOnly = 0;
                var numofObjectsinBothTimes = 0;
                var objectsInPreviousTimeOnly = [];
                var objectsInNextTimeOnly = [];
                var objectsInBothTimes = [];

                for (var objectId in lattice.objects)
                {
                    var tempOb = lattice.objects[objectId];
                    if (objectId != 0)
                    {
                        if (((tempOb.version & version) > 0) && (tempOb.version & nextVersion) == 0)
                        {
                            numofObjectsInPreviousTimeOnly++;
                            objectsInPreviousTimeOnly.push(tempOb);
                        }

                        if (((tempOb.version & nextVersion) > 0) && (tempOb.version & version) == 0)
                        {
                            numofObjectsInNextTimeOnly++;
                            objectsInNextTimeOnly.push(tempOb);
                        }
                        if (((tempOb.version & version) > 0) && (tempOb.version & nextVersion) > 0)
                        {
                            numofObjectsinBothTimes++;
                            objectsInBothTimes.push(tempOb);
                        }
                    }
                }
                var tempArrayObjects = [objectsInPreviousTimeOnly, objectsInNextTimeOnly, objectsInBothTimes];
                listOfDiffObjects.push(tempArrayObjects);

                var data = [
                {
                    "value": numofObjectsInPreviousTimeOnly,
                    "versionIndex": i
                },
                {
                    "value": numofObjectsInNextTimeOnly,
                    "versionIndex": i
                },
                {
                    "value": numofObjectsinBothTimes,
                    "versionIndex": i
                }];
                var diffPreviewDiv = diffPreviewsContainer.append("div").classed("svgContainer preview", true);
                var diffPreviewCanvas = diffPreviewDiv.append("svg");
                // constructVisualization(
                // {
                //     lattice: lattice,
                //     versions: [version, nextVersion],
                //     svgCanvas: diffPreviewCanvas,
                //     width: guiParams.previewWidth,
                //     height: guiParams.previewHeight,
                //     type: "diff",
                //     isPreview: true
                // });
                diffPreviewDiv.on("click", function()
                {
                    d3.selectAll(".svgContainer.preview").classed("divSelected", false);
                    d3.select(this).classed("divSelected", true);
                })

                var width = guiParams.previewWidth;
                var height = guiParams.previewHeight;
                var paddingBetweenBars = 2;
                var barHeight = height / (data.length) - 2 * paddingBetweenBars;
                var leftLegendSpace = 20;
                var radius = 5;
                var iconSpace = 22;
                var height = guiParams.previewHeight;
                var pad = 13;
                var separation = 5;

                var xScale = d3.scale.linear().domain([0, Object.keys(lattice.objects).length]).range([0, width - leftLegendSpace - 3]);
                var yScale = d3.scale.linear().domain([0, 2]).range([0 + radius + paddingBetweenBars, height - radius - paddingBetweenBars]);
                diffPreviewCanvas.attr(
                {
                    "width": width,
                    "height": height
                });
                var g = diffPreviewCanvas.append("g");


                // Legend for diff preview container
                // var previewLegend = diffPreviewsContainer.append("svg").attr({
                //     "width": 25,
                //     "height": guiParams.previewHeight
                // });
                g.append("line").attr(
                {
                    x1: iconSpace - 1,
                    y1: 2,
                    x2: iconSpace - 1,
                    y2: height - 2,
                    "stroke-width": 1,
                    "stroke": "black"
                });
                // g.append("rect").attr({
                //     x:0,
                //     y: 0,
                //     "width" : leftLegendSpace,
                //     "height": guiParams.previewHeight/3,
                //     "fill":"none"
                // }).append("title").text("# objects only in "+filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", ""));

                var previousT = g.append("path").attr("d", function()
                {
                    var path = "";
                    var sweepFlag = 0;
                    path += "M -0.25," + (-radius);
                    path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                    return path;
                }).attr("fill", "grey").attr(
                {
                    "stroke-width": 0
                }).attr("transform", function(d)
                {
                    return "translate(" + (iconSpace / 2 - 1) + ", " + (yScale(0)) + ")"
                }).append("title").text("# objects only in " + filenames[window.allVersions.indexOf(versions[i])].replace(".csv", ""));


                var nextT = g.append("path").attr("d", function()
                {
                    var path = "";
                    var sweepFlag = 1;
                    path += "M 0.25," + (-radius);
                    path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                    return path;
                }).attr("fill", "grey").attr(
                {
                    "stroke-width": 0
                }).attr("transform", function(d)
                {
                    return "translate(" + (iconSpace / 2 + 1) + ", " + (yScale(1)) + ")"
                }).append("title").text("# objects only in " + filenames[window.allVersions.indexOf(versions[i + 1])].replace(".csv", ""));

                var bothT = g.append("path").attr("d", function()
                {
                    var path = "";
                    path += "M -0.25," + (-radius);
                    path += "A " + radius + "," + radius + " 0 0," + 0 + "," + "-0.25," + radius;
                    path += "M 0.25," + (-radius);
                    path += "A " + radius + "," + radius + " 0 0," + 1 + "," + "0.25," + radius;
                    return path;
                }).attr("fill", "grey").attr(
                {
                    "stroke-width": 0
                }).attr("transform", function(d)
                {
                    return "translate(" + (iconSpace / 2) + ", " + (yScale(2)) + ")"
                }).append("title").text("# objects in " + filenames[window.allVersions.indexOf(versions[i])].replace(".csv", "") + " and " + filenames[window.allVersions.indexOf(versions[i + 1])].replace(".csv", ""));;


                var barsSelection = g.selectAll(".bar")
                    .data(data).enter();

                var bars = barsSelection.append("rect")
                    .attr("class", "bar diffTimelineBar")
                    .attr("x", xScale(0) + 1 + leftLegendSpace)
                    .attr("y", function(d, i)
                    {

                        return i * ((2 * paddingBetweenBars) + barHeight) + paddingBetweenBars;
                        // console.log(yScale(i));
                        // return yScale(i); 
                    })
                    .attr("fill", "grey").attr("opacity", 0.8)
                    .attr("width", function(d)
                    {
                        return xScale(d.value);
                    })
                    .attr("height", barHeight);

                bars.on("click", function(d, i)
                {
                    showObjectsInList(d, i);
                });

                function showObjectsInList(d, barIndex)
                {
                    // var filteredObjectList = [];
                    // if(barIndex ==0)
                    //     filteredObjectList = listOfDiffObjects[d.versionIndex][barIndex];
                    // else if(barIndex==1)
                    //     filteredObjectList = objectsInNextTimeOnly;
                    // else if(barIndex == 2)
                    // filteredObjectList = objectsInBothTimes;
                    console.log(listOfDiffObjects[d.versionIndex][barIndex]);
                    updateObjectListWithSelection(listOfDiffObjects[d.versionIndex][barIndex], true);
                    d3.event.stopPropagation();
                }

                var textWidth = 15;
                barsSelection.append("text").attr("class","axis").style("dominant-baseline","hanging")
                    .attr(
                    {
                        x: function(d)
                        {
                            var temp = xScale(d.value) + 1 + leftLegendSpace + 4;
                            if (temp < (xScale(Object.keys(lattice.objects).length) + leftLegendSpace - textWidth))
                                return temp;
                            else
                                return xScale(d.value) + leftLegendSpace - textWidth - 5;
                        },
                        y: function(d, i)
                        {
                            return i * ((2 * paddingBetweenBars) + barHeight) + paddingBetweenBars ;
                        },
                        // "font-size": barHeight,
                        "fill": function(d)
                        {
                            var temp = xScale(d.value) + 1 + leftLegendSpace + 4;
                            if (temp < (xScale(Object.keys(lattice.objects).length) + leftLegendSpace - textWidth))
                                return "grey";
                            else
                                return "white";
                        }
                    })
                    .text(function(d)
                    {
                        return d.value;
                    })

                bars.append("title").text(function(d)
                {
                    return d.value;
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

        var tempheight = d3.select("#individualVersionRow").node().getBoundingClientRect().height;
        d3.select("#navigationLegend").attr("style","float:left;width:30px;height:"+tempheight+"px;");

        var navigationLegendSVG = d3.select("#navigationLegend").append("svg").attr("width",30).attr("height",tempheight);
        var top_bottommargin = (tempheight - guiParams.previewHeight)/2;
        navigationLegendSVG.append("line").attr({
            "x1":29,
            "y1":top_bottommargin,
            "x2":29,
            "y2": tempheight - top_bottommargin,
            "stroke":"black"
        });

        var tickG = navigationLegendSVG.append("g");
                var tickValues = [0,Math.floor(window.maxNumOfObjectsInAnyConcept/2),window.maxNumOfObjectsInAnyConcept];
                for(var b=0; b<tickValues.length; b++)
                {
                    tickG.append("text").text(tickValues[b]).attr({
                        "x":22,
                        "y":top_bottommargin+ window.yScaleForNavigationBarCharts(tickValues[b])+5,
                        "fill":"black",
                        "class":"y axis",
                        "text-anchor":"end"
                    })
                    ;
                    tickG.append("line").attr({
                        "x1":24,
                        "y1":top_bottommargin+ window.yScaleForNavigationBarCharts(tickValues[b]),
                        "x2":29,
                        "y2":top_bottommargin+ window.yScaleForNavigationBarCharts(tickValues[b]),
                        "stroke":"black",
                        "class":"y axis"
                    });
                }
                // tickG.append("text")
                // // .attr("transform", "translate("+0 + ",0)")
                // .attr("x", 0)
                // .attr("y", 0)
                // .attr("dy", ".5em")
                // .style("text-anchor", "middle")
                // .text("# objects")
                // .attr("transform", " translate(" + (5) + ","+(tempheight)/2+") rotate(-90) ")
                // .attr("class", "axisLabel");

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
            window.isSVGRequiredToHandleClickInWhiteArea = true;
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
                    "stroke": "black",
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
            if (highlightRect)
            {
                highlightRect.remove();
                highlightRect = null;
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
            if (window.count != 1)
            {

                if (selectedVersions.length == 1)
                {
                    if (!(filenames === undefined))
                    {
                        individualVersionString = "Timestep " + filenames[versions.indexOf(selectedVersions[0])].replace(".csv", "");
                    }
                    labelContainer.text(individualVersionString);
                }

                else if (selectedVersions.length == 2)
                {
                    if (!(filenames === undefined))
                    {
                        diffString1 = "Diff view between timesteps " + filenames[versions.indexOf(selectedVersions[0])].replace(".csv", "");
                        diffString2 = " and " + filenames[versions.indexOf(selectedVersions[1])].replace(".csv", "")
                    }
                    // labelContainer.text(diffString);
                    labelContainer.selectAll("*").remove();
                    labelContainer.text("");
                    labelContainer.append("label").text(diffString1);
                    labelContainer.append("span").attr("style", "display:inline-block; width:8px;")
                    labelContainer.append("label").text(" (");
                    var t = labelContainer.append("svg").attr("width", 50).attr("height", 20);
                    t.append("path").attr("d", "M -0.25,-5.303300858899107A 5.303300858899107,5.303300858899107 0 0,0,-0.25,5.303300858899107").attr("style", "fill:black; stroke-with:0").attr("transform", "translate(8,10)");
                    t.append("text").text("/").attr(
                    {
                        "x": 9,
                        "y": 17,
                        "fill": "black",
                        "font-size": "20px"
                    })
                    t.append("path").attr("stroke-dasharray", visParams.diffStrokeA).attr("stroke", "black").attr("d", "M16 10 l215 0").attr("stroke-width", 2);
                    labelContainer.append("label").text(") ");
                    labelContainer.append("span").attr("style", "display:inline-block; width:8px;")


                    labelContainer.append("label").text(diffString2);
                    labelContainer.append("span").attr("style", "display:inline-block; width:8px;")

                    labelContainer.append("label").text(" (");
                    // labelContainer.append("svg").attr("width",50).attr("height",20).append("path").attr("stroke-dasharray", visParams.diffStrokeB).attr("stroke", "black").attr("d","M0 10 l215 0").attr("stroke-width", 2);
                    var t = labelContainer.append("svg").attr("width", 67).attr("height", 20);
                    t.append("path").attr("d", "M 0.25,-5.303300858899107A 5.303300858899107,5.303300858899107 0 0,1,0.25,5.303300858899107").attr("style", "fill:black; stroke-with:0").attr("transform", "translate(2,10)");
                    t.append("text").text("/").attr(
                    {
                        "x": 9,
                        "y": 17,
                        "fill": "black",
                        "font-size": "20px"
                    })
                    t.append("path").attr("stroke-dasharray", visParams.diffStrokeB).attr("stroke", "black").attr("d", "M16 10 l215 0").attr("stroke-width", 2);
                    labelContainer.append("label").text(") ");

                }
                else
                {
                    labelContainer.text("");
                }
            }

            destroyhighlightSelectedPreviewForDiff(selectedVersions[0]);

            if (selectedVersions.length > 0 && selectedVersions.length != 2 && window.count != 1)
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
                if (selectionRect2)
                {
                    selectionRect2.remove();
                    selectionRect2 = null;
                }

            }
            else if (window.count == 1 && selectedVersions.length == 1)
            {
                highlightSelectedPreviewForDiff(selectedVersions[0]);

            }
            else if (selectedVersions.length == 2)
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
                if (selectionRect)
                {
                    selectionRect.remove();
                    selectionRect = null;
                }

                if (selectionRect2)
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

        d3.selectAll(".numSets").text(tempData.length);
        // window.NumBaseSets = tempData.length;
        //    console.log(params.versions[0], tempData);
        for (var item in tempData)
        {
            tempData[item].version = params.versions[0];
        }

        var width = guiParams.previewWidth;
        var height = guiParams.previewHeight;

        var allObjects = Object.keys(params.lattice.objects);

        // tempData.push({name: "total", count: allObjects.length })
        var namesArray = [];
        for (var item in tempData)
        {
            namesArray.push(tempData[item].name);
        }
        var x = d3.scale.ordinal()
            // .domain(allConceptNames)
            .domain(namesArray)
            .rangeRoundBands([0, width], 0.2);
        // .range([0, width]);

        var y = d3.scale.linear().range([height, 0]);


        var allObjectsFiltered = [];
        objectsDict = params.lattice.objects;
        for (var key in objectsDict)
        {
            if (objectsDict[key].version & params.versions[0])
                allObjectsFiltered.push(objectsDict[key]);
        }
        // y.domain([0, allObjectsFiltered.length]);
        // y.domain([0, allObjects.length]);
        y.domain([0, window.maxNumOfObjectsInAnyConcept]);
        
        window.yScaleForNavigationBarCharts = y;
        // var g = params.svgCanvas.append("g");
        params.svgCanvas.selectAll("*").remove();
        params.svgCanvas.attr("viewBox", null);
        var g = params.svgCanvas.append("g");

        for (var set of tempData)
        {
            if (!("count" in set))
                set.count = 0;
        }

        var barsSelection = g.selectAll(".bar")
            .data(tempData)
            .enter();
        var bars = barsSelection.append("rect")
            .attr("class", function(d)
            {
                if (d.count > 0)
                    return "bar individualVersionNavigationBars bar" + d.objectsFiltered[0].conceptId + " barVersion" + params.versions[0];
                else
                    return "bar individualVersionNavigationBars";

            })
            .attr("x", function(d)
            {
                return x(d.name);
            })
            .attr("y", function(d)
            {
                return y(d.count) + 1;
            })
            .attr("fill", function(d)
            {
                var color = colors_g[allConceptNames.indexOf(d.name)];
                // console.log(color);
                return color;
            })
            //   .attr("opacity", visParams.previewBarOpacity)
            .attr("opacity", 0.9)
            .attr("width", x.rangeBand())
            .attr("height", function(d)
            {
                return height - y(d.count);
            });
        //   .attr("transform", "scale("+1+","+(guiParams.previewWidth/guiParams.previewHeight)+  ")" + " translate("+x1+","+(y1)+  ")");

        bars.append("title").text(function(d)
        {
            return "#" + d.name + ": " + d.count;
        });
        // bars.on("mousedown", function(){
        //     if(d3.event.ctrlKey)
        //         window.handleBarClick = false;
        //     else
        //         window.handleBarClick = true;
        // });
        bars.on("click", function(d, i)
        {
            // d3.selectAll(".svgContainer.preview").classed("divSelected", false);
            // if(d3.event.ctrlKey)
            // {
            //     if(window.count==0)
            //     {
            //         window.count1=1;
            //         window.diffVersionArray1=[d.version];
            //     }
            //     else if(window.count1 ==1)
            //     {
            //         window.count1=0;
            //         window.diffVersionArray1.push(d.version);
            //         diffVersionArray1.sort(function(a, b){return a - b});
            //         navigateCallbackWrapper(window.diffVersionArray1, "diff");
            //     }
            // }
            // else 
            // {
            //     d3.selectAll(".individualVersionNavigationBars").classed("barClicked",false);
            //     d3.select(this).classed("barClicked",true);
            //     window.objects["conceptSelection"]=tidDict;
            //     window.selectedConceptIdForHighlight = d.objectsFiltered[0].conceptId;
            //     navigateCallbackWrapper([d.version], "aggregate");
            //     d3.select(".bar"+d.objectsFiltered[0].conceptId)
            //     var tidDict = {};
            //     for(var j=0; j<d.objectsFiltered.length; j++)
            //     {
            //         tidDict[d.objectsFiltered[j].objectId] = 1;
            //     }
            //     addTimestepTag(currentVersion, "conceptSelection", "conceptSelection");
            //     updateListWithCurrentSelection();
            //     d3.event.stopPropagation();
            // }
        });

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
        if (params.versions.length == 1)
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
            handleClick = true;
            window.mouseDowned = true;
            window.clickAndDragged = false;
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
        svgCanvasNode.addEventListener("mousemove", function(e)
        {
            beingDragged = false;
            handleClick = false;
            if (window.mouseDowned == true)
            {
                window.clickAndDragged = true;
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

    function handleTypeClicked(type, d)
    {
        console.log(type, d);
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
        visualization.svgCanvas.attr("viewBox", visualization.fieldOfView.x + " " + visualization.fieldOfView.y + " " + visualization.fieldOfView.width + " " + (visualization.fieldOfView.height + 40));
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
        var conceptsInCurrentVersion = [];
        var allConceptNamesIdsDict = {};

        var conceptArray = Object.values(lattice.concepts);
        var conceptArrayFiltered = [];

        for (var i = 0; i < conceptArray.length; i++)
        {
            if ((conceptArray[i].version & version) > 0)
            {
                conceptArrayFiltered.push(conceptArray[i]);
            }
        }

        for (var i = 0; i < conceptArrayFiltered.length; i++)
        {
            // if(allConceptNames.indexOf(conceptArray[i].fullName)>=0)
            {
                if (!(conceptArrayFiltered[i].fullName in allConceptNamesIdsDict))
                {
                    allConceptNamesIdsDict[conceptArrayFiltered[i].fullName] = {
                        id: conceptArrayFiltered[i].id,
                        count: conceptArrayFiltered[i].objectsFiltered.length,
                        objectsFiltered: conceptArrayFiltered[i].objectsFiltered
                    };
                }
                else
                {
                    allConceptNamesIdsDict[conceptArrayFiltered[i].fullName].count += conceptArray[i].objectsFiltered.length;
                    allConceptNamesIdsDict[conceptArrayFiltered[i].fullName].objectsFiltered = conceptArray[i].objectsFiltered;
                }
            }
        }
        allConceptNamesIdsDictFiltered = {};

        keysArray = Object.keys(allConceptNamesIdsDict);
        for (var i = 0; i < keysArray.length; i++)
        {
            var temp = keysArray[i].split(", ");
            if (temp.length == 1)
            {
                allConceptNamesIdsDictFiltered[keysArray[i]] = allConceptNamesIdsDict[keysArray[i]];
            }
        }

        var jsonArray = [];
        for (var i = 0; i < allConceptNames.length; i++)
        {
            var tempDict = {};
            if (allConceptNames[i] in allConceptNamesIdsDictFiltered)
            {
                tempDict.name = allConceptNames[i];
                tempDict.count = allConceptNamesIdsDictFiltered[allConceptNames[i]].count;
                tempDict.objectsFiltered = allConceptNamesIdsDict[allConceptNames[i]].objectsFiltered;

            }
            else
            {
                tempDict.name = allConceptNames[i];
                // tempDict.count = 0;
                var foundInMinLayerNum = 99999;
                var foundFullName = "";
                var isSubset = false;
                for (var p = 0; p < conceptArrayFiltered.length; p++)
                {
                    if (conceptArrayFiltered[p].isDummy) continue;
                    if (conceptArrayFiltered[p].fullName.indexOf(tempDict.name) >= 0)
                    {
                        if (foundInMinLayerNum > conceptArrayFiltered[p].layer)
                        {
                            foundInMinLayerNum = conceptArrayFiltered[p].layer;
                            foundFullName = conceptArrayFiltered[p].fullName;
                            isSubset = true;
                        }
                    }
                }
                if (isSubset)
                {
                    tempDict.count = allConceptNamesIdsDict[foundFullName].count;
                    tempDict.objectsFiltered = allConceptNamesIdsDict[foundFullName].objectsFiltered;
                }

            }
            jsonArray.push(tempDict);
        }
        if (!("stats" in lattice))
        {
            lattice.stats = {};
        }

        if (!(version in lattice.stats))
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
        d3.selectAll(".conceptEdge").attr("stroke-opacity", 0);
        var conceptList = compileConceptList(lattice, versionFilter);
        // if (window.clearFocussedConceptEdges)
        // {
        //     for(var i=0; i<conceptList.length; i++)
        //     {
        //         conceptList[i].isFocused = false;
        //     }
        // }

        // Construct list of edges that need to be rendered.
        var conceptEdgeList = compileConceptEdgeList(lattice, conceptList, versionFilter);
        if (versions.length == 1)
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
            conceptListtemp = Object.values(lattice.concepts);
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
            var sizeLegendSvg = d3.select("g .legend");
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
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "-5px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Size (Object):");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[2] / Math.PI);
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[2] / Math.PI);
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "15px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "35px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0])) / 2.0).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / Math.PI);
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / Math.PI);
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "60px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[1]).toFixed(2));

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "85px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Position:");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "105px"
                    })
                    .attr("font-size", "10px")
                    .text('Object in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "125px"
                    })
                    .attr("font-size", "10px")
                    .text('Object in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") + "");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "145px"
                    })
                    .attr("font-size", "10px")
                    .text('Object in both ');
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "156px"
                    })
                    .attr("font-size", "10px")
                    .text("" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "" + " and " + "" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") + "");

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1 ), 300, 350)
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
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "175px"
                    })
                    .attr("font-size", "10px")
                    .text('Highest intersection level');
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "190px"
                    })
                    .attr("font-size", "10px")
                    .text('for the object in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "205px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "1 1")
                    .attr("transform", "translate(-5,225)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "1 1")
                    .attr("transform", "translate(-5,235)");
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "241px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text('Set/Edge only in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "");


                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "5 2")
                    .attr("transform", "translate(-5,255)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "5 2")
                    .attr("transform", "translate(-5,265)");
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "271px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text('Set/Edge only in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") + "");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,285)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,295)");
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "295px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text('Set/Edge in both');
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "310px"
                    })
                    .attr("font-size", "10px")
                    .text(filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + " and " +
                        filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", ""));




                var bbox = sizeLegendSvg.node().getBBox();

                var rect = sizeLegendSvg.append("rect")
                    .attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 5)
                    .attr("rx", "10px")
                    .attr("ry", "10px")
                    .attr("width", bbox.width + 2 * 5)
                    .attr("height", bbox.height + 2 * 5)
                    .style("fill", "#f4f4f4")
                    .style("fill-opacity", "1")
                    .style("stroke", "black")
                    .style("stroke-width", "1px");

                visParams.legendBoundingBox = bbox;

                // sizeLegendSvg.attr("transform", "translate("+ (visualization.bbox.x2 + 30)+","+(visualization.bbox.y2 - bbox.height +10) + ")");
                sizeLegendSvg.attr("transform", "translate(" + (visualization.bbox.x1 - 200) + "," + (visualization.bbox.y1) + ")");

                // sizeLegendSvg.attr("transform", "translate("+ (40)+","+30 + ")");


                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "-5px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Size (Object):");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[2] / Math.PI);
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[2] / Math.PI);
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "15px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "35px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0])) / 2.0).toFixed(2));

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / Math.PI);
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / Math.PI);
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "60px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[1]).toFixed(2));

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "85px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Position:");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "105px"
                    })
                    .attr("font-size", "10px")
                    .text('Object in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "125px"
                    })
                    .attr("font-size", "10px")
                    .text('Object in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") + "");

                sizeLegendSvg.append("path").attr("d", function(d)
                {
                    var path = "";
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    var sweepFlag = 1;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "145px"
                    })
                    .attr("font-size", "10px")
                    .text('Object in both ');
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "160px"
                    })
                    .attr("font-size", "10px")
                    .text("" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "" + " and " + "" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") + "");

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1 ), 300, 350)
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
                    var sweepFlag = 0;
                    var radius = Math.sqrt(objectSizeScale[3] / (2 * Math.PI));
                    if (0 == 0)
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
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "175px"
                    })
                    .attr("font-size", "10px")
                    .text('Highest intersection level');
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "190px"
                    })
                    .attr("font-size", "10px")
                    .text('for the object in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "210px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "1 1")
                    .attr("transform", "translate(-5,225)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "1 1")
                    .attr("transform", "translate(-5,235)");
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "241px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text('Set/Edge only in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + "");


                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "5 2")
                    .attr("transform", "translate(-5,255)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "5 2")
                    .attr("transform", "translate(-5,265)");
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "271px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text('Set/Edge only in ' + "" + filenames[window.allVersions.indexOf(selectedVersions[1])].replace(".csv", "") + "");

                sizeLegendSvg.append("rect")
                    .attr("width", "18px")
                    .attr("height", "10px")
                    .attr("fill", "#f4f4f3")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,285)");

                sizeLegendSvg.append("line")
                    .attr("x1", "0px")
                    .attr("y1", "9px")
                    .attr("x2", "18px")
                    .attr("y2", "9px")
                    .attr("strike-width", "2px")
                    .attr("stroke", "black")
                    // .attr("stroke-dasharray","5 2")
                    .attr("transform", "translate(-5,295)");
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "295px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text('Set/Edge in both');
                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "310px"
                    })
                    .attr("font-size", "10px")
                    .text(filenames[window.allVersions.indexOf(selectedVersions[0])].replace(".csv", "") + " and " +
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
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "-5px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Size (Object):");

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[2] / Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "10px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "15px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3] / (2 * Math.PI)))
                    .attr('cx', "0px")
                    .attr('cy', "30px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "35px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0])) / 2.0).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3] / Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "50px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "55px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[1]).toFixed(2));

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1), 300, 60)
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
                    .attr('r', Math.sqrt(objectSizeScale[3] / (2 * Math.PI)))
                    .attr('cx', "0px")
                    .attr('cy', "75px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "75px"
                    })
                    .attr("font-size", "10px")
                    .text('Highest intersection level');

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "85px"
                    })
                    .attr("font-size", "10px")
                    .text('for the object');

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "105px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "10px").attr("height", "10px")
                    .attr("rx", "2px")
                    .attr("ry", "2px")
                    .attr("fill", "#1a8e6a")
                    .attr("strike-width", "0px")
                    .attr("transform", "translate(0,115)");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "125px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Base set");




                var bbox = sizeLegendSvg.node().getBBox();

                var rect = sizeLegendSvg.append("rect")
                    .attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 5)
                    .attr("rx", "10px")
                    .attr("ry", "10px")
                    .attr("width", bbox.width + 2 * 5)
                    .attr("height", bbox.height + 2 * 5)
                    .style("fill", "#f4f4f4")
                    .style("fill-opacity", "1")
                    .style("stroke", "black")
                    .style("stroke-width", "1px");

                visParams.legendBoundingBox = bbox;

                // sizeLegendSvg.attr("transform", "translate("+ (0)+","+(bbox.y1-10) + ")");
                // sizeLegendSvg.attr("transform", "translate("+ (bbox.x1)+","+(bbox.y1-10) + ")");
                // sizeLegendSvg.attr("transform", "translate("+ (visualization.bbox.x2 + 30)+","+(visualization.bbox.y2 - bbox.height +10) + ")");
                sizeLegendSvg.attr("transform", "translate(" + (visualization.bbox.x1 - 200) + "," + (visualization.bbox.y1) + ")");

                // sizeLegendSvg.attr("transform", "translate("+ (40)+","+30 + ")");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "-5px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Size (Object):");

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[2] / Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "10px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "15px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[0]).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3] / (2 * Math.PI)))
                    .attr('cx', "0px")
                    .attr('cy', "30px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "35px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat((parseFloat(objectSizeScale[1]) + parseFloat(objectSizeScale[0])) / 2.0).toFixed(2));

                sizeLegendSvg.append('circle')
                    .attr('r', Math.sqrt(objectSizeScale[3] / Math.PI))
                    .attr('cx', "0px")
                    .attr('cy', "50px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "55px"
                    })
                    .attr("font-size", "10px")
                    .text(parseFloat(objectSizeScale[1]).toFixed(2));

                var arc = sizeLegendSvg.append("path").attr(
                {
                    d: function()
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1), 300, 60)
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
                    .attr('r', Math.sqrt(objectSizeScale[3] / (2 * Math.PI)))
                    .attr('cx', "0px")
                    .attr('cy', "75px");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "75px"
                    })
                    .attr("font-size", "10px")
                    .text('Highest intersection level');

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "90px"
                    })
                    .attr("font-size", "10px")
                    .text('for the object');

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "-5px"
                    })
                    .attr("dy", function(d)
                    {
                        return "105px"
                    })
                    .attr("font-size", "10px")
                    // .attr("font-weight", "bold")
                    .text("Style (Set):");

                sizeLegendSvg.append("rect")
                    .attr("width", "10px").attr("height", "10px")
                    .attr("rx", "2px")
                    .attr("ry", "2px")
                    .attr("fill", "#1a8e6a")
                    .attr("strike-width", "0px")
                    .attr("transform", "translate(0,115)");

                sizeLegendSvg.append('text')
                    .attr("dx", function(d)
                    {
                        return "20px"
                    })
                    .attr("dy", function(d)
                    {
                        return "125px"
                    })
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

        var objectPresenceDict = {};
        objectPresenceDict = addSelectionInformationAndFindSelectedObjects2(visualization, conceptList, conceptEdgeList, selectedConcepts);
        // console.log(objectPresenceDict);

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
        // selections.separatorUpdate.attr("text-anchor", "middle")
        selections.separatorUpdate.attr("text-anchor", "left")
            .attr(
            {
                // x:(visualization.bbox.x1 + visualization.bbox.x2)/2 + 300/2
                x: (visualization.bbox.x2 + 20)
            }).attr("y", function(d)
            {
                return d.y + d.height - 20;
            }).attr(
            {
                fill: "#ccc"
            }).text(function(d)
            {
                return d.num;
            }).attr("font-size", visParams.layerLabelsFontSize)
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
                if (d.isExtra)
                {
                    return "20, 10";
                }
                else if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected)
                {
                    return "";
                }
                else
                {
                    if ((d.version & (versionA | versionB)) === (versionA | versionB))
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
                y: -visParams.layerMargin / 2 + 10,
                "fill-opacity": 0
                // "stroke-opacity":0
            })
            .attr("width", function(d)
            {
                return d.width + visParams.conceptMargin * 2;
            }).attr("height", function(d)
            {
                return d.height + visParams.layerMargin / 2 + 5;
            }).attr("class", function(d)
            {
                return "border id" + d.id;
            })
            .classed("svgSelectedConcept", true)
            .attr("style", function(d)
            {
                if (window.selectedConceptIdForHighlight == undefined || window.selectedConceptIdForHighlight.length ==0)
                    return "stroke-opacity:0";
                else
                {
                    if (window.selectedConceptIdForHighlight.indexOf(d.id)>=0)
                        return "stroke-opacity:1";
                    else
                        return "stroke-opacity:0";
                }
            })
            .attr("title", function(d){
                var names=d.fullName.split(", ");
                var titlestr="";
                for(var i=0; i<names.length; i++)
                {
                    titlestr += "["+names[i]+"]";
                    if(i<(names.length-1))
                        titlestr += " and ";
                }
                return titlestr;
            });
       
        
        selections.conceptCreate.append("rect").attr(
            {
                x: -visParams.conceptMargin,
                y: -visParams.layerMargin / 2 + 10,
                "fill-opacity": 0
                // "stroke-opacity":0
            })
            .attr("width", function(d)
            {
                return d.width + visParams.conceptMargin * 2;
            }).attr("height", function(d)
            {
                return d.height + visParams.layerMargin / 2 + 5;
            }).attr("style", "cursor:pointer;");

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
            "stroke-width": 1
        }).attr("style", "cursor:pointer;")
        .on("mouseenter",function(d){
            var names=d.fullName.split(", ");
            var titlestr="";
            for(var i=0; i<names.length; i++)
            {
                titlestr += "["+names[i]+"]";
                if(i<(names.length-1))
                    titlestr += " and ";
            }
            conceptTooltip.show(titlestr);
        })
        .on("mouseout", function(){
            conceptTooltip.hide();
            d3.selectAll(".d3-tip").remove();

        });

        var iconSpace = 20;
        var rightPadding = 10;
        var barMaxWidth = visParams.conceptWidth - iconSpace - rightPadding;
        var maxObjects = Object.keys(lattice.objects).length;
        var barScale = d3.scale.linear().domain([0, maxObjects]).range([0, barMaxWidth]);
        var radius = 2;

        if (visualization.type == "diff")
        {
            // for previous timestep
            selections.conceptCreate.append("rect").classed("concept", true).attr(
                {
                    x: function(d)
                    {
                        return -2
                    },
                    y: function(d)
                    {
                        return d.height - 2
                    },
                    rx: 4,
                    ry: 4
                })
                .attr("width", function(d)
                {
                    return 20;
                    return d.width;
                }).attr("height", function(d)
                {
                    return 14;
                    return d.height;
                }).attr(
                {
                    "fill": "white",
                    // "stroke": "grey",
                    "stroke-width": visParams.cardinalityBoxWidth

                }).attr("stroke", function(d)
                {
                    if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                    return versionToColor(d.version);
                });

            selections.conceptCreate.append("text")
                .attr(
                {
                    "dominant-baseline": "middle",
                    "text-anchor": "middle",
                    "fill": "black",
                    "font-size": 10
                })
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0)
                            cardinality++;
                    }
                    return cardinality;
                })
                .attr(
                {
                    x: function(d)
                    {
                        return 8
                    },
                    y: function(d)
                    {
                        return d.height + 6
                    }
                });

            // for next timestep
            selections.conceptCreate.append("rect").classed("concept", true).attr(
                {
                    x: function(d)
                    {
                        return d.width - 18
                    },
                    y: function(d)
                    {
                        return d.height - 2
                    },
                    rx: 4,
                    ry: 4
                })
                .attr("width", function(d)
                {
                    return 20;
                    return d.width;
                }).attr("height", function(d)
                {
                    return 14;
                    return d.height;
                }).attr(
                {
                    "fill": "white",
                    // "stroke": "grey",
                    // "stroke-width": 2
                    "stroke-width": visParams.cardinalityBoxWidth

                }).attr("stroke", function(d)
                {
                    if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                    return versionToColor(d.version);
                });

            selections.conceptCreate.append("text")
                .attr(
                {
                    "dominant-baseline": "middle",
                    "text-anchor": "middle",
                    "fill": "black",
                    "font-size": 10
                })
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionB) > 0)
                            cardinality++;
                    }
                    return cardinality;
                })
                .attr(
                {
                    x: function(d)
                    {
                        return d.width - 8
                    },
                    y: function(d)
                    {
                        return d.height + 6
                    }
                });

            // For stats of differences



            selections.conceptCreate.append("path").attr("d", function()
            {
                var path = "";
                var sweepFlag = 0;
                path += "M -0.25," + (-radius);
                path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "-0.25," + radius;
                return path;
            }).attr("fill", "grey").attr(
            {
                "stroke-width": 0
            }).attr("transform", function(d)
            {
                return "translate(" + (iconSpace / 2 - 1) + ", " + (d.height + 17) + ")"
            }).append("title").text("# objects only in " + filenames[window.allVersions.indexOf(versionA)].replace(".csv", ""));

            selections.conceptCreate.append("path").attr("d", function()
            {
                var path = "";
                var sweepFlag = 1;
                path += "M 0.25," + (-radius);
                path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0.25," + radius;
                return path;
            }).attr("fill", "grey").attr(
            {
                "stroke-width": 0
            }).attr("transform", function(d)
            {
                return "translate(" + (iconSpace / 2 + 1) + ", " + (d.height + 24) + ")"
            }).append("title").text("# objects only in " + filenames[window.allVersions.indexOf(versionB)].replace(".csv", ""));

            selections.conceptCreate.append("path").attr("d", function()
            {
                var path = "";
                path += "M -0.25," + (-radius);
                path += "A " + radius + "," + radius + " 0 0," + 0 + "," + "-0.25," + radius;
                path += "M 0.25," + (-radius);
                path += "A " + radius + "," + radius + " 0 0," + 1 + "," + "0.25," + radius;
                return path;
            }).attr("fill", "grey").attr(
            {
                "stroke-width": 0
            }).attr("transform", function(d)
            {
                return "translate(" + (iconSpace / 2) + ", " + (d.height + 31) + ")"
            }).append("title").text("# objects in " + filenames[window.allVersions.indexOf(versionA)].replace(".csv", "") + " and " + filenames[window.allVersions.indexOf(versionB)].replace(".csv", ""));

            selections.conceptCreate.append("line")
                .attr(
                {
                    x1: iconSpace,
                    y1: function(d)
                    {
                        return d.height + 13
                    },
                    x2: iconSpace,
                    y2: function(d)
                    {
                        return d.height + 35
                    },
                    "stroke": "grey",
                    "stroke-width": 1
                })

            var statsBarForPreviousTimestep = selections.conceptCreate.append("g");
            statsBarForPreviousTimestep.append("rect").classed("conceptStatsBar", true).attr(
                {
                    x: iconSpace,
                    y: function(d)
                    {
                        return d.height + 15
                    },
                })
                .attr("width", function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) == 0)
                            cardinality++;
                    }
                    return barScale(cardinality);

                }).attr("height", 4).append("title")
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) == 0)
                            cardinality++;
                    }
                    return cardinality
                })

                .on("click", function(d, i)
                {
                    handleTypeClicked("previousOnly", d);
                    d3.event.stopPropagation();
                });

            // + ": #objects only in "+ filenames[window.allVersions.indexOf(versionA)].replace(".csv", "")
            // .append("title").text("# objects only in "+filenames[window.allVersions.indexOf(versionA)].replace(".csv", ""))
            statsBarForPreviousTimestep.append("text")
                .attr(
                {
                    "dominant-baseline": "mathematical",
                    "text-anchor": "left",
                    "fill": "grey",
                    "font-size": 6
                })
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) == 0)
                            cardinality++;
                    }
                    return cardinality;
                })
                .attr(
                {
                    x: function(d)
                    {
                        var cardinality = 0;
                        for (var i = 0; i < d.objectsFiltered.length; i++)
                        {
                            if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) == 0)
                                cardinality++;
                        }
                        return iconSpace + barScale(cardinality) + 2
                    },
                    y: function(d)
                    {
                        return d.height + 15
                    }
                });
            statsBarForPreviousTimestep.on("mouseenter", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode).selectAll(".rightOnly, .bothTimes").transition().ease("ease-in").duration(window.durationValue).attr("opacity", 0);
                d3.event.stopPropagation();
            });
            statsBarForPreviousTimestep.on("mouseleave", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode).selectAll(".rightOnly, .bothTimes").transition().ease("ease-out").duration(window.durationValue).attr("opacity", 1);
                d3.event.stopPropagation();
            });



            var statsBarForNextTimestep = selections.conceptCreate.append("g");
            statsBarForNextTimestep.append("rect").classed("conceptStatsBar", true).attr(
                {
                    x: iconSpace,
                    y: function(d)
                    {
                        return d.height + 22
                    },
                })
                .attr("width", function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionB) > 0 && (d.objectsFiltered[i].version & versionA) == 0)
                            cardinality++;
                    }
                    return barScale(cardinality);

                }).attr("height", 4).append("title")
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionB) > 0 && (d.objectsFiltered[i].version & versionA) == 0)
                            cardinality++;
                    }
                    return cardinality
                });

            statsBarForNextTimestep.append("text")
                .attr(
                {
                    "dominant-baseline": "mathematical",
                    "text-anchor": "left",
                    "fill": "grey",
                    "font-size": 6
                })
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionB) > 0 && (d.objectsFiltered[i].version & versionA) == 0)
                            cardinality++;
                    }
                    return cardinality;
                })
                .attr(
                {
                    x: function(d)
                    {
                        var cardinality = 0;
                        for (var i = 0; i < d.objectsFiltered.length; i++)
                        {
                            if ((d.objectsFiltered[i].version & versionB) > 0 && (d.objectsFiltered[i].version & versionA) == 0)
                                cardinality++;
                        }
                        return iconSpace + barScale(cardinality) + 2
                    },
                    y: function(d)
                    {
                        return d.height + 22
                    }
                });
            statsBarForNextTimestep.on("mouseenter", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode).selectAll(".leftOnly, .bothTimes").transition().ease("ease-in").duration(window.durationValue).attr("opacity", 0);
                d3.event.stopPropagation();
            });
            statsBarForNextTimestep.on("mouseleave", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode).selectAll(".leftOnly, .bothTimes").transition().ease("ease-out").duration(window.durationValue).attr("opacity", 1);
                d3.event.stopPropagation();
            });

            var statsBarForBothTimes = selections.conceptCreate.append("g");
            statsBarForBothTimes.append("rect").classed("conceptStatsBar", true).attr(
                {
                    x: iconSpace,
                    y: function(d)
                    {
                        return d.height + 29
                    },
                })
                .attr("width", function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) > 0)
                            cardinality++;
                    }
                    return barScale(cardinality);

                }).attr("height", 4).append("title")
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) > 0)
                            cardinality++;
                    }
                    return cardinality
                });

            statsBarForBothTimes.append("text")
                .attr(
                {
                    "dominant-baseline": "mathematical",
                    "text-anchor": "left",
                    "fill": "grey",
                    "font-size": 6
                })
                .text(function(d)
                {
                    var cardinality = 0;
                    for (var i = 0; i < d.objectsFiltered.length; i++)
                    {
                        if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) > 0)
                            cardinality++;
                    }
                    return cardinality;
                })
                .attr(
                {
                    x: function(d)
                    {
                        var cardinality = 0;
                        for (var i = 0; i < d.objectsFiltered.length; i++)
                        {
                            if ((d.objectsFiltered[i].version & versionA) > 0 && (d.objectsFiltered[i].version & versionB) > 0)
                                cardinality++;
                        }
                        return iconSpace + barScale(cardinality) + 2
                    },
                    y: function(d)
                    {
                        return d.height + 29
                    }
                });
            statsBarForBothTimes.on("mouseenter", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode).selectAll(".leftOnly, .rightOnly").transition().ease("ease-in").duration(window.durationValue).attr("opacity", 0);
                d3.event.stopPropagation();
            });
            statsBarForBothTimes.on("mouseleave", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode).selectAll(".leftOnly, .rightOnly").transition().ease("ease-out").duration(window.durationValue).attr("opacity", 1);
                d3.event.stopPropagation();
            });


        }
        // For aggregate or individual timesteps
        else
        {
            var conceptSelectionTemp = selections.conceptCreate.append("g").classed("conceptBottomStats", true);
            conceptSelectionTemp.append("rect").classed("concept", true).attr(
                {
                    x: function(d)
                    {
                        return d.width / 2 - 10
                    },
                    y: function(d)
                    {
                        return d.height - 2
                    },
                    rx: 4,
                    ry: 4
                })
                .attr("width", function(d)
                {
                    return 20;
                    return d.width;
                }).attr("height", function(d)
                {
                    return 14;
                    return d.height;
                }).attr(
                {
                    "fill": "white",
                    // "stroke": "grey",
                    "stroke-width": visParams.cardinalityBoxWidth
                }).attr("stroke", function(d)
                {
                    if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                    return versionToColor(d.version);
                });
            // .attr("transform", "translate(-50%, -50%)");

            conceptSelectionTemp.append("text")
                .attr(
                {
                    "dominant-baseline": "middle",
                    "text-anchor": "middle",
                    // "fill":"black",
                    "font-size": 10
                })
                .text(function(d)
                {
                    return d.objectsFiltered.length;
                })
                .attr(
                {
                    x: function(d)
                    {
                        return d.width / 2
                    },
                    y: function(d)
                    {
                        return d.height + 6
                    }
                }).attr("fill", function(d)
                {
                    if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                    return versionToColor(d.version);
                });


            var hatDataForVeryConcept = {};
            for (var conceptId in lattice.concepts)
            {
                var numberofhats = 0;
                hatDataForVeryConcept[conceptId] = {};
                var temp = lattice.concepts[conceptId].objectsFiltered;
                for (var z = 0; z < temp.length; z++)
                {
                    var getCurrentObjectId = temp[z].objectId;
                    var layerNumberOfConcept = lattice.concepts[conceptId].layer;
                    var tempHighestLayerInAllVersions = -1;
                    for (var j in versions)
                    {
                        if (lattice.objects[getCurrentObjectId].highestLayerInfo[versions[j]] > tempHighestLayerInAllVersions) tempHighestLayerInAllVersions = lattice.objects[getCurrentObjectId].highestLayerInfo[versions[j]];
                    }
                    if (tempHighestLayerInAllVersions == layerNumberOfConcept)
                    {
                        numberofhats++;
                    }
                }
                hatDataForVeryConcept[conceptId]["withHat"] = numberofhats;
                hatDataForVeryConcept[conceptId]["withoutHat"] = temp.length - numberofhats;
            }
            var withHatLegendGroup = conceptSelectionTemp.append("g");


            withHatLegendGroup.append("path").attr(
            {
                d: describeArc(0, 0, 1 + (visParams.objectMaxSize / 3), 300, 60),
                // cx: 0,
                // cy: 0,
                // r: visParams.objectMaxSize / 2,
                "stroke": function(d)
                {
                    return "grey";
                },
                // "stroke":"black",
                "fill": "none",
                "fill-opacity": 0
            }).attr("transform", function(d)
            {
                return "translate(" + (iconSpace / 2 - 1) + ", " + (d.height + 17) + ")"
            });;

            withHatLegendGroup.append("circle").attr(
            {
                x: 0,
                y: 0,
                r: radius
            }).attr("fill", "grey").attr(
            {
                "stroke-width": 0
            }).attr("transform", function(d)
            {
                return "translate(" + (iconSpace / 2 - 1) + ", " + (d.height + 17) + ")"
            });
            //  NOT WORKING CURRENTLY
            // withHatLegendGroup.append("rect").attr({
            //     x:0,
            //     y:function(d){ return (d.height +17)- (1 + (visParams.objectMaxSize / 3))} ,
            //     "width": visParams.objectMaxSize,
            //     "height": visParams.objectMaxSize/3 + (2*radius),
            //     "fill":"none"
            // })
            // .classed("withHatLegend", true);

            var withoutHatLegendGroup = conceptSelectionTemp.append("g").classed("withoutHatLegend", true);
            withoutHatLegendGroup.append("circle").attr(
            {
                x: 0,
                y: 0,
                r: radius
            }).attr("fill", "grey").attr(
            {
                "stroke-width": 0
            }).attr("transform", function(d)
            {
                return "translate(" + (iconSpace / 2 - 1) + ", " + (d.height + 24) + ")"
            });




            conceptSelectionTemp.append("line")
                .attr(
                {
                    x1: iconSpace,
                    y1: function(d)
                    {
                        return d.height + 13
                    },
                    x2: iconSpace,
                    y2: function(d)
                    {
                        return d.height + 28
                    },
                    "stroke": "grey",
                    "stroke-width": 1
                })

            statsBarGroupWithHat = conceptSelectionTemp.append("g");
            statsBarGroupWithHat.append("rect").classed("conceptStatsBar", true)
                .attr(
                {
                    x: iconSpace,
                    y: function(d)
                    {
                        return d.height + 15
                    },
                })
                .attr("width", function(d)
                {
                    return barScale(hatDataForVeryConcept[d.id].withHat);

                }).attr("height", 4).append("title").text(function(d)
                {
                    return hatDataForVeryConcept[d.id].withHat;
                });
            statsBarGroupWithHat.append("text")
                .attr(
                {
                    "dominant-baseline": "mathematical",
                    "text-anchor": "left",
                    "fill": "grey",
                    "font-size": 6
                })
                .text(function(d)
                {
                    return hatDataForVeryConcept[d.id].withHat;
                })
                .attr(
                {
                    x: function(d)
                    {
                        return iconSpace + barScale(hatDataForVeryConcept[d.id].withHat) + 2
                    },
                    y: function(d)
                    {
                        return d.height + 15
                    }
                });

            withHatLegendGroup.on("mouseenter", function(d, i)
            {
                console.log(d, i, this);
                d3.select(this.parentNode.parentNode).selectAll(".withoutHat").transition().ease("ease-in").duration(window.durationValue).attr("opacity", 0);
                d3.event.stopPropagation();
            });
            statsBarGroupWithHat.on("mouseenter", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode.parentNode).selectAll(".withoutHat").transition().ease("ease-in").duration(window.durationValue).attr("opacity", 0);
                d3.event.stopPropagation();
            });
            withHatLegendGroup.on("mouseleave", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode.parentNode).selectAll(".withoutHat").transition().ease("ease-out").duration(window.durationValue).attr("opacity", 1);
                d3.event.stopPropagation();
            });
            statsBarGroupWithHat.on("mouseleave", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode.parentNode).selectAll(".withoutHat").transition().ease("ease-out").duration(window.durationValue).attr("opacity", 1);
                d3.event.stopPropagation();
            });

            statsBarGroupWithoutHat = conceptSelectionTemp.append("g");
            statsBarGroupWithoutHat.append("rect").classed("conceptStatsBar", true)
                .attr(
                {
                    x: iconSpace,
                    y: function(d)
                    {
                        return d.height + 22
                    },
                })
                .attr("width", function(d)
                {
                    return barScale(hatDataForVeryConcept[d.id].withoutHat);

                }).attr("height", 4).append("title").text(function(d)
                {
                    return hatDataForVeryConcept[d.id].withoutHat;
                });
            statsBarGroupWithoutHat.append("text")
                .attr(
                {
                    "dominant-baseline": "mathematical",
                    "text-anchor": "left",
                    "fill": "grey",
                    "font-size": 6
                })
                .text(function(d)
                {
                    return hatDataForVeryConcept[d.id].withoutHat;
                })
                .attr(
                {
                    x: function(d)
                    {
                        return iconSpace + barScale(hatDataForVeryConcept[d.id].withoutHat) + 2
                    },
                    y: function(d)
                    {
                        return d.height + 22
                    }
                });
            statsBarGroupWithoutHat.on("mouseenter", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode.parentNode).selectAll(".withHat, .withHat>path").transition().ease("ease-in").duration(window.durationValue).attr("opacity", 0);
                d3.event.stopPropagation();
            });
            statsBarGroupWithoutHat.on("mouseleave", function(d, i)
            {
                // console.log(d,i,this);
                d3.select(this.parentNode.parentNode).selectAll(".withHat, .withHat>path").transition().ease("ease-out").duration(window.durationValue).attr("opacity", 1);
                d3.event.stopPropagation();
            });


            // Draw Timeline
            var maxObjectInAnyConceptInaTimestep = -1;
            for(var cid in timeLineDataForConcepts)
            {
                for(var tid in timeLineDataForConcepts[cid])
                {
                    var tempVal = timeLineDataForConcepts[cid][tid];
                    if(maxObjectInAnyConceptInaTimestep < tempVal) maxObjectInAnyConceptInaTimestep = tempVal;
                }
            }

            
            var timelineBoxHeight = 20;
            var leftPadding = 0;
            var timelineBoxWidth = visParams.conceptWidth - leftPadding;
            
            var heightScale = d3.scale.linear().domain([0, maxObjectInAnyConceptInaTimestep]).range([0, -timelineBoxHeight]);
            var widthScale = d3.scale.linear().domain([1, window.numberOftimesteps]).range([leftPadding, timelineBoxWidth]);

            var timelineGroup = conceptSelectionTemp.append("g");

            // timelineGroup.append("rect")
            //     .attr({
            //         x: leftPadding,
            //         y: function(d){return d.height + 30},
            //         "width": widthScale(window.numberOftimesteps) + 2 - leftPadding,
            //         "height": timelineBoxHeight,
            //         "stroke-width":1,
            //         "stroke":"#cccccc",
            //         "fill": "none"
            //     });

            timelineGroup.append("line")
                .attr(
                {
                    x1: leftPadding,
                    y1: function(d)
                    {
                        return d.height + 26
                    },
                    x2: leftPadding,
                    y2: function(d)
                    {
                        return d.height + 30 + timelineBoxHeight
                    },
                    "stroke": "#cccccc",
                    "stroke-width": 1
                })
            timelineGroup.append("line")
                .attr(
                {
                    x1: leftPadding,
                    y1: function(d)
                    {
                        return d.height + 30 + timelineBoxHeight
                    },
                    x2: widthScale(window.numberOftimesteps) + 2,
                    y2: function(d)
                    {
                        return d.height + 30 + timelineBoxHeight
                    },
                    "stroke": "#cccccc",
                    "stroke-width": 1
                })


            timelineGroup.append("polyline")
                .attr(
                {
                    "points": function(d)
                    {
                        pointstring = "";
                        var conceptData = window.timeLineDataForConcepts[d.id];


                        var timesteps = Object.keys(conceptData);
                        for (var i = 0; i < window.numberOftimesteps; i++)
                        {
                            var x = widthScale(i + 1);
                            var versionNum = Math.pow(2, i);
                            var y = -1;
                            if (versionNum in conceptData)
                                y = (d.height + 30 + timelineBoxHeight) + heightScale(conceptData[versionNum]);
                            else
                                y = (d.height + 30 + timelineBoxHeight);
                            pointstring += x + "," + y + " ";
                            if (versions.length == 1 && versions[0] == versionNum)
                            {
                                d.circlex = x;
                                d.circley = y;
                            }
                        }
                        return pointstring;
                    },
                    "fill": "none",
                    // "stroke": "grey",
                    "stroke-width": 1

                }).attr("stroke", function(d)
                {
                    if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                    return versionToColor(d.version);
                });
            if (versions.length == 1)
            {
                timelineGroup.append("circle")
                    .attr(
                    {
                        "cx": function(d)
                        {
                            return d.circlex;
                        },
                        "cy": function(d)
                        {
                            return d.circley;
                        },
                        "r": 2,
                        // "fill":"#ffe699"
                        // "fill":"grey"
                    }).attr("fill", function(d)
                    {
                        if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected) return versionToColor(versionAggregated);
                        return versionToColor(d.version);
                    });
            }

            //Line for num of objects over time
            // timelineGroup.append("polyline")
            //     .attr({
            //         "points": function(d){
            //             pointstring="";
            //             var conceptData = window.numObjectsOverTime;


            //             // var timesteps = Object.keys(conceptData);
            //             for(var i=0; i<window.numberOftimesteps; i++)
            //             {
            //                 var x = widthScale(i+1);
            //                 var versionNum = Math.pow(2,i);
            //                 var y=-1;
            //                 if(versionNum in conceptData)
            //                     y = (d.height + 30 + timelineBoxHeight) + heightScale( conceptData[versionNum] );
            //                 else
            //                     y=(d.height + 30 + timelineBoxHeight);
            //                 pointstring += x +","+y +" ";
            //                 if(versions.length ==1 && versions[0]==versionNum)
            //                     {
            //                         d.circlex = x;
            //                         d.circley = y;
            //                     }
            //             }
            //             return pointstring;
            //         },
            //         "fill":"none",
            //         "stroke": "#cccccc",
            //         "stroke-width": 1

            //     });
            // if(versions.length ==1)
            // {
            //     timelineGroup.append("circle")
            //         .attr({
            //             "cx": function(d){
            //                 return d.circlex;
            //             },
            //             "cy": function(d){
            //                 return d.circley;
            //             },
            //             "r":2,
            //             // "fill":"#ffe699"
            //             "fill":"grey"
            //         });
            // }

        }

        // Create text and rect for cardinality of concepts


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
            if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected)
            {
                return versionToColor(versionAggregated);
            }
            else
            {
                return versionToColor(d.version);
            }
        }).attr("stroke-dasharray", function(d)
        {
            if (visualization.type == "aggregate" && visualization.isSelectionActive && d.isSelected)
            {
                return "";
            }
            else
            {
                if ((d.version & (versionA | versionB)) === (versionA | versionB))
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

        if (visualization.type == "aggregate")
        {
            widthOfRectangle = 5;
            selections.conceptCreate.append("rect").classed("aggOpacity", true).attr({
                "x": widthOfRectangle*-1,
                "y":0,
                "width": widthOfRectangle,
                "stroke":"none"

            }).attr("fill",function(d)
            {
                return versionToColor(d.version);
            })
            .attr("height",function(d)
            {
                return d.height;
            })
        }
        if(window.selectedVersions!= undefined && window.selectedVersions.length ==1)
        {
            d3.selectAll(".aggOpacity").remove();

        }


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
            return "translate(" + (d.x) + "," + d.y + ")";
        }).attr("class", function(d)
        {
            var getCurrentconceptId = d.conceptId;
            var getCurrentObjectId = d.objectId;
            var objectidstring = "objectid" + d.objectId;
            var layerNumberOfConcept = lattice.concepts[getCurrentconceptId].layer;
            if (typeof currentVersion != 'undefined')
            {
                var tempHighestLayerInAllVersions = -1;
                for (var i in currentVersion)
                {
                    if (lattice.objects[getCurrentObjectId].highestLayerInfo[currentVersion[i]] > tempHighestLayerInAllVersions) tempHighestLayerInAllVersions = lattice.objects[getCurrentObjectId].highestLayerInfo[currentVersion[i]];
                }
                if (tempHighestLayerInAllVersions == layerNumberOfConcept) return objectidstring + " object withHat"
            }
            return objectidstring + " object withoutHat";
        });




        if (visualization.type == "diff")
        {
            // console.log("here");
            appendObjectHalfcircles(selections.objectCreate, versionA);
            appendObjectHalfcircles(selections.objectCreate, versionB);
            adjustClasses(selections.objectCreate, versionA, versionB);
        }
        else if (visualization.type == "aggregate")
        {
            appendObjectCircles(selections.objectCreate);
        }
        else
        {
            throw new Error("Invalid visualization type");
        }

        function adjustClasses(objectCreateSelection, versionA, versionB)
        {
            for (var p = 0; p < objectCreateSelection.length; p++)
            {
                for (var q = 0; q < objectCreateSelection[p].length; q++)
                {
                    var objectElementLeft = d3.select(objectCreateSelection[p][q]).selectAll("path.leftOnly");
                    var objectElementRight = d3.select(objectCreateSelection[p][q]).selectAll("path.rightOnly");
                    if (objectElementLeft[0].length > 0 && objectElementRight[0].length > 0)
                    {
                        var currentClasses = d3.select(objectCreateSelection[p][q]).selectAll("path").attr("class");
                        currentClasses = currentClasses.replace("leftOnly", "bothTimes");
                        currentClasses = currentClasses.replace("rightOnly", "bothTimes");
                        d3.select(objectCreateSelection[p][q]).selectAll("path").attr("class", currentClasses);
                    }
                    // console.log(objectElementLeft, objectElementRight, d3.select(objectCreateSelection[p][q]).selectAll("path").attr("class"));
                    // console.log(objectCreateSelection[p][q]);

                }
            }

        }

        /// Creates halfcircles corresponding to a particular version (A or B).
        function appendObjectHalfcircles(objectCreateSelection, version)
        {
            var sweepFlag = version === versionA ? 0 : 1;
            if (guiParams.shape === "circle")
            {
                var halfObject = objectCreateSelection.filter(function(d)
                {
                    return (d.version & version) > 0 ? this : null;
                }).append("path").attr("d", function(d)
                {
                    var path = "";
                    var radius = d.radii[version];
                    if (sweepFlag == 0)
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
                // console.log(version, halfObject);
                halfObject.attr("class", function(d)
                {

                    var returnClass = d.objectId + " " + "object ";
                    if (sweepFlag == 0)
                        returnClass += "leftOnly "
                    else
                        returnClass += "rightOnly "

                    var isExclusiveob = checkExclusive(d, [version], "diff");

                    if (isExclusiveob == 1)
                        returnClass += "isExclusive";
                    else if (isExclusiveob == 0)
                        returnClass += "isNotExclusive";
                    // console.log("here");
                    // if(d.objectId == 1301818069)
                    //     {console.log(returnClass);
                    //         if(version == 32)
                    //             console.log(returnClass)
                    //     }
                    return returnClass;
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
                        var sweepdirection = sweepFlag == 0 ? -1 : 1;
                        if (sweepFlag == 0)
                        {
                            path += "M " + (-radius - 1) + "," + (-radius) + " h " + (sweepdirection * radius) + " v " + (visParams.objectMaxSize) + " h " + (-1 * sweepdirection * radius) + " Z"
                        }
                        else
                        {
                            path += "M " + (-radius + 1) + "," + (-radius) + " h " + (sweepdirection * radius) + " v " + (visParams.objectMaxSize) + " h " + (-1 * sweepdirection * radius) + " Z"
                        }

                        // path += "M 0," + (-radius);
                        // path += "A " + radius + "," + radius + " 0 0," + sweepFlag + "," + "0," + radius;
                        return path;
                    }).attr("fill", function(d, i)
                    {
                        if (sweepFlag == 0)
                        {
                            return "none";
                        }
                        else
                        {
                            return "black";
                        }
                    })
                    .attr("stroke-width", "1px")
                    .attr("stroke", "black");
            }

            var halfObjectArc = objectCreateSelection.filter(function(d)
            {
                return (d.version & version) > 0 ? this : null;
            }).append("path").attr(
            {
                d: function()
                {
                    if (sweepFlag == 0)
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1), 300, 350)
                    }
                    else
                    {
                        return describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1), 10, 60)
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
            halfObjectArc.attr("class", function(d)
            {

                var returnClass = d.objectId + " " + "arcs ";
                if (sweepFlag == 0)
                    returnClass += "leftOnly "
                else
                    returnClass += "rightOnly "

                var isExclusive = checkExclusive(d, [version], "diff");
                if (isExclusive == 1)
                    returnClass += "isExclusive";
                else
                    returnClass += "isNotExclusive";

                return returnClass;
            });
            return objectCreateSelection;
        }
        /// Creates circles that aggregate all the versions.
        function appendObjectCircles(objectCreateSelection)
        {
            if (guiParams.shape === "circle")
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
                            return r * visParams.objectMaxSize;
                        })));
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
                d: describeArc(0, 0, 1 + (visParams.objectMaxSize / 2 +1), 300, 60),
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
            var tempGroup = selections.conceptCreate.append("g").classed("intent", true)
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
                attributes.sort(function(a, b)
                {
                    return allConceptNames.indexOf(b) - allConceptNames.indexOf(a);
                });

                allConceptNames.forEach(function(attr, index)
                {
                    var dy = index == 0 ? 0 : -visParams.intentLabelFontSize;
                    pos = allConceptNames.indexOf(attr);
                    // console.log(bBox.height);
                    {
                        var pad = 2;
                        var labelPad = 1;
                        var conceptTopPad = 2;
                        fillColor = colors_g[pos];

                        var conceptColoredBoxPad = (visParams.conceptWidth - (allConceptNames.length * ((visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight)))) / (allConceptNames.length + 1);


                        var occupiedSpace = ((d.width / 2) - (visParams.conceptWidth / 2) + allConceptNames.length * ((visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + conceptColoredBoxPad));
                        var freeSpace = visParams.conceptWidth - occupiedSpace;
                        var leftPaddingForCentering = freeSpace / 2;
                        // result += "<rect class = \"textBackground\"  x=\"" + ((d.width / 2)-(bBox.width/2)) + "\" y=\"" + (- (visParams.intentLabelFontSize+pad)*(index+1)) +"\" width=\""+ bBox.width+ "\" height=\"" + visParams.intentLabelFontSize + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        // result += "<rect class = \"textBackground\"  x=\"" + ( conceptColoredBoxPad + (d.width / 2)-(visParams.conceptWidth/2) + pos*((visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight)+conceptColoredBoxPad)) + "\" y=\"" + (- (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) - conceptTopPad - (pad)) +"\" width=\""+ (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize*visParams.intentNonLabelSmallRectHeight) + "\" fill=\""+fillColor +"\">"  + "</rect>";
                        if(attributes.indexOf(attr)>=0)
                            result += "<rect class = \"textBackground\" stroke=\"black\" stroke-width=\"1px\" x=\"" + (conceptColoredBoxPad + (d.width / 2) - (visParams.conceptWidth / 2) + pos * ((visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + conceptColoredBoxPad)) + "\" y=\"" + (-(visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) - 2) + "\" width=\"" + (visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + "\" rx=\"5\"" + "\" ry=\"5\"" + "\" fill=\"" + fillColor + "\">" + "<title>" + attr + "</title>" + "</rect>";
                        else
                            result += "<rect class = \"textBackground\" stroke=\"black\" stroke-width=\"1px\" x=\"" + (conceptColoredBoxPad + (d.width / 2) - (visParams.conceptWidth / 2) + pos * ((visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + conceptColoredBoxPad)) + "\" y=\"" + (-(visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) - 2) + "\" width=\"" + (visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + "\" height=\"" + (visParams.intentLabelFontSize * visParams.intentNonLabelSmallRectHeight) + "\" rx=\"5\"" + "\" ry=\"5\"" + "\" fill=\"" + "white" + "\">" + "<title>" + attr + "</title>" + "</rect>";

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
                        var conceptLabelYPos = (-(visParams.intentLabelFontSize) * (index) - conceptTopPad) - (index * (pad + labelPad));
                        if (index == 0) conceptLabelYPos = conceptLabelYPos - 1;
                        // console.log(conceptLabelYPos);

                        // if(d.name.split(',').length ==1)
                        // if(d.name.length > 0)
                        // {
                        //     result += "<text x=\"" + (d.width / 2) + "\" y=\"" + conceptLabelYPos + "\" text-anchor= \"middle\" font-size=\"" +visParams.intentLabelFontSize  +"px \">" +attr;
                        //     result += "</text>";    
                        // }
                        // if(d.fullName.split(',').length ==1)
                        if (d.name.length > 0) //Condition to check if it has either one name or more than one name due to subset relationsship

                        {
                            if (d.fullName.split(',').length == 1) //Condition to check if it has only one name and no subset relationship
                            {
                                if(attributes.indexOf(attr)>=0)
                                {
                                    result += "<text x=\"" + (d.width / 2) + "\" y=\"" + (-(visParams.intentLabelFontSize) * (attributes.indexOf(attr) + 1) - conceptTopPad - (index * pad) - 6) + "\" text-anchor= \"middle\" font-size=\"" + visParams.intentLabelFontSize + "px" + "\"" + " style=fill:" + fillColor + ";" + " >" + attr;
                                    result += "</text>";
                                }
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

        window.objectsClimbedUp = 0;
        window.objectsClimbedDown = 0;
        var objectDiffEdge2 = null;
        visualization.root.selectAll("path.objectDiffEdge").remove();
        // Object diff edge only makes sense in a 'diff' visualization.
        if (visualization.type == "diff")
        {
            objectDiffEdge = computeObjectDiffEdgeVisuals(visualization, conceptList, selectedObjectEdges, versionA, versionB);

            var diffedgearray = [];
            for (var ob in objectPresenceDict)
            {
                var t = computeObjectDiffEdgeVisuals2(visualization, conceptList, objectPresenceDict[ob], versionA, versionB);
                // console.log(t);
                if (t != null)
                // if(false)
                {
                    if (t.fromY > t.toY)
                        window.objectsClimbedUp++;
                    else if (t.fromY < t.toY)
                        window.objectsClimbedDown++;

                    diffedgearray.push(t);
                    // visualization.root.select("#diff"+t.from.objectId).remove();
                    // var xyz = visualization.root.select();
                    var fromConceptId = t.from.conceptId;
                    var toConceptId = t.to.conceptId;
                    var fromlayerNum = getLayerNum(fromConceptId, lattice);
                    var tolayerNum = getLayerNum(toConceptId, lattice);
                    var classname = "l" + fromlayerNum + "l" + tolayerNum;
                    xyz = visualization.root.append("path").classed("objectDiffEdge", true).attr("id", "diff" + t.from.objectId)
                        .classed(classname, true).classed("diffEdgeHidden", true);
                    xyz.attr("d", function()
                    {
                        // Render the edge itself taking in account its length.
                        var r = visParams.objectMaxSize / 2 + 3;
                        var a = {
                            x: 0,
                            y: r
                        };
                        var b = {
                            x: t.length - r,
                            y: 0
                        };
                        var c = {
                            x: 0,
                            y: -r
                        };
                        // Modifying for having an arrow head
                        return "M" + a.x + "," + a.y + " L" + b.x + "," + b.y + " L" + (b.x - 9) + "," + (b.y - 5) + " L" + (b.x - 9) + "," + (b.y + 5) + " L" + b.x + "," + b.y + " L" + c.x + "," + c.y + " A" + r + "," + r + " 0 0,1 " + a.x + "," + a.y;

                    }).attr("transform", function()
                    {
                        // Rotate and position the edge on the visualization.
                        var degrees = Math.atan2(t.deltaY, t.deltaX) / Math.PI * 180;
                        var rotate = "rotate(" + degrees + ",0,0)";
                        var translate = "translate(" + t.fromX + "," + t.fromY + ")";
                        return translate + " " + rotate;
                    }).attr(
                    {
                        stroke: 2,
                        fill: "url(#objectDiffEdgeGradient)",
                        style: "pointer-events: none;fill-opacity:" + visParams.diffEdgeFillOpacity

                    });
                }
            }
            // console.log("#Objects climbed to higher layers: " + window.objectsClimbedUp + " # objects went to lower layers: "+window.objectsClimbedDown);
            // console.log(diffedgearray);
            summaryDictionary = computeSummaryVerticalArrowsForTaperedEdges(diffedgearray, lattice);
            drawsummaryTaperedEdges(summaryDictionary);
        }

        function drawsummaryTaperedEdges(summaryDictionary)
        {
            var layerVerticalPositions = {};
            var layerNumArray = Object.keys(window.layerHeights);
            layerNumArray.sort();
            for (var i = 0; i < layerNumArray.length; i++)
            {
                var sum = 0;
                for (var j = 0; j <= i; j++) sum += window.layerHeights[layerNumArray[j]];
                layerVerticalPositions[layerNumArray[i]] = (-1) * sum;
            }
            var minValue = 999999;
            var maxValue = -99999;
            for (k in summaryDictionary)
            {
                for (k2 in summaryDictionary[k])
                {
                    var value = summaryDictionary[k][k2].value;
                    if (value < minValue) minValue = value;
                    if (value > maxValue) maxValue = value;
                    summaryDictionary[k][k2].fromY = layerVerticalPositions[k];
                    summaryDictionary[k][k2].toY = layerVerticalPositions[k2];
                }
            }
            // console.log(summaryDictionary);
            var leftPadding = visualization.bbox.x2 + 70;


            var rightMostX = visualization.bbox.x2 + 145;
            var paddingBetweenArrows = 35;
            var currentX = rightMostX;

            var minwidth = 1;
            var maxWidth = 3;
            var circleRadius = 13;
            var arrowSize = 25;

            d3.selectAll(".summaryArrow").remove();
            d3.selectAll(".summaryArrowHorizontal").remove();

            window.sortedArrowsArray = [];
            window.samelevelarrowsarray = [];
            var firstKeys = Object.keys(summaryDictionary);
            firstKeys.sort();

            for (var i = 0; i < firstKeys.length; i++)
            {
                var secondKeys = Object.keys(summaryDictionary[firstKeys[i]]);
                secondKeys.sort();
                // secondKeys.reverse();
                for (var j = 0; j < secondKeys.length; j++)
                {
                    var tempdict = {};
                    tempdict["from"] = firstKeys[i];
                    tempdict["to"] = secondKeys[j];
                    tempdict["value"] = summaryDictionary[firstKeys[i]][secondKeys[j]].value;
                    tempdict["fromY"] = summaryDictionary[firstKeys[i]][secondKeys[j]].fromY;
                    tempdict["toY"] = summaryDictionary[firstKeys[i]][secondKeys[j]].toY;
                    tempdict["fromX"] = summaryDictionary[firstKeys[i]][secondKeys[j]].fromX;
                    tempdict["toX"] = summaryDictionary[firstKeys[i]][secondKeys[j]].toX;
                    tempdict["objectIds"] = summaryDictionary[firstKeys[i]][secondKeys[j]].objectIds;


                    if (secondKeys[j] > firstKeys[i])
                    {
                        sortedArrowsArray.push(tempdict);
                    }
                    else if (secondKeys[j] == firstKeys[i])
                    {
                        samelevelarrowsarray.push(tempdict);
                    }
                }
            }
            firstKeys.reverse();
            for (var i = 0; i < firstKeys.length; i++)
            {
                var secondKeys = Object.keys(summaryDictionary[firstKeys[i]]);
                secondKeys.sort();
                secondKeys.reverse();
                for (var j = 0; j < secondKeys.length; j++)
                {
                    var tempdict = {};
                    tempdict["from"] = firstKeys[i];
                    tempdict["to"] = secondKeys[j];
                    tempdict["value"] = summaryDictionary[firstKeys[i]][secondKeys[j]].value;
                    tempdict["fromY"] = summaryDictionary[firstKeys[i]][secondKeys[j]].fromY;
                    tempdict["toY"] = summaryDictionary[firstKeys[i]][secondKeys[j]].toY;
                    tempdict["fromX"] = summaryDictionary[firstKeys[i]][secondKeys[j]].fromX;
                    tempdict["toX"] = summaryDictionary[firstKeys[i]][secondKeys[j]].toX;
                    tempdict["objectIds"] = summaryDictionary[firstKeys[i]][secondKeys[j]].objectIds;

                    if (secondKeys[j] < firstKeys[i])
                    {
                        sortedArrowsArray.push(tempdict);
                    }
                }
            }

            var summaryHorizontalArrows = visualization.root.selectAll("g.summaryArrowHorizontal").data(samelevelarrowsarray)
                .enter().append("g")
                .attr("class", function(d)
                {
                    var classname = "l" + d.from + "l" + d.to;
                    return "summaryArrowHorizontal " + classname;
                });


            summaryHorizontalArrows.append("circle")
                .attr("cx", function(d, i)
                {
                    return leftPadding;
                })
                .attr("cy", function(d)
                {
                    return d.fromY
                })
                .attr("r", circleRadius)
                // .attr("stroke","#cccccc")
                .attr("stroke-width", function(d)
                {
                    var val = d.value;
                    var ratio = (val - minValue) / (maxValue - minValue);
                    var wid = ratio * (maxWidth - minwidth) + minwidth;
                    return wid;
                })
                .attr("fill", "white");

            summaryHorizontalArrows.append("line")
                .attr("x1", function(d, i)
                {
                    return leftPadding - arrowSize - circleRadius;
                })
                .attr("y1", function(d)
                {
                    return d.fromY + arrowSize / 2;
                })
                .attr("x2", function(d, i)
                {
                    var val = d.value;
                    var ratio = (val - minValue) / (maxValue - minValue);
                    var wid = ratio * (maxWidth - minwidth) + minwidth;
                    return leftPadding - circleRadius - 10;
                })
                .attr("y2", function(d)
                {
                    return d.toY + 5
                })
                .attr("style", function(d)
                {
                    return 2;
                })
                .attr("marker-end", "url(#arrow)");

            summaryHorizontalArrows.append("line")
                .attr("x1", function(d, i)
                {
                    return leftPadding + arrowSize + circleRadius;
                })
                .attr("y1", function(d)
                {
                    return d.fromY + arrowSize / 2;
                })
                .attr("x2", function(d, i)
                {
                    var val = d.value;
                    var ratio = (val - minValue) / (maxValue - minValue);
                    var wid = ratio * (maxWidth - minwidth) + minwidth;
                    return leftPadding + circleRadius + 10;
                })
                .attr("y2", function(d)
                {
                    return d.toY + 5
                })
                .attr("style", function(d)
                {
                    return 2;
                })
                .attr("marker-end", "url(#arrow)");



            summaryHorizontalArrows.append("text")
                .attr("x", function(d, i)
                {
                    return leftPadding;
                })
                .attr("y", function(d)
                {
                    return d.fromY
                })
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#cccccc")
                .text(function(d)
                {
                    return d.value
                });

            summaryHorizontalArrows.on("mouseover", function(d)
            {
                // console.log(samelevelarrowsarray, d);
                var classname = "l" + d.from + "l" + d.to;
                d3.selectAll("path." + classname).classed("diffEdgeHidden", false);
                d3.select(this).classed("summaryArowHovered", true);
                d3.select(this).selectAll("line").attr("marker-end", "url(#arrowhighlighted)");
            })
            summaryHorizontalArrows.on("click", function(d)
            {
                d3.event.stopPropagation();

                var classname = "l" + d.from + "l" + d.to;
                // console.log(window.clickedArrows);
                if (!(classname in window.clickedArrows))
                {
                    d3.selectAll(".summaryArowHovered").classed("summaryArowHovered", false);
                    for (var edge in window.clickedArrows)
                        d3.selectAll("path." + edge).classed("diffEdgeHidden", true);

                    window.clickedArrows = {};
                    delete window.objects["move"];
                    updateListWithCurrentSelection();
                    d3.select(".move").remove();


                    window.clickedArrows[classname] = [d.from, d.to];
                    d3.selectAll("path." + classname).classed("diffEdgeHidden", false);
                    d3.select(this).classed("summaryArowHovered", true);
                    d3.select(this).selectAll("line").attr("marker-end", "url(#arrowhighlighted)");

                    // updateObjectListWithSelection(d.objectIds, false, true);
                    var tempoidDict = {};
                    for (var g = 0; g < d.objectIds.length; g++)
                        tempoidDict[d.objectIds[g]] = 1;
                    window.objects["move"] = tempoidDict;
                    window.arrowFrom = d.from;
                    window.arrowTo = d.to;
                    addTimestepTag([d.from, d.to], "move", "move");
                }
                else
                {
                    delete window.clickedArrows[classname];
                    d3.select(this).classed("summaryArowHovered", false);
                    d3.selectAll("path." + classname).classed("diffEdgeHidden", true);
                    d3.select(this).selectAll("line").attr("marker-end", "url(#arrow)");

                    window.clickedArrows = {};
                    delete window.objects["move"];
                    updateListWithCurrentSelection();
                    d3.select(".move").remove();
                }
                d3.event.stopPropagation();
                // console.log(window.clickedArrows);
            })

            summaryHorizontalArrows.on("mouseup", function(d)
            {
                window.clickAndDragged = false;
                window.isSVGRequiredToHandleClickInWhiteArea = false;
                // d3.event.stopPropagation();
            });
            summaryHorizontalArrows.on("mouseout", function(d)
            {
                // console.log(d);
                var classname = "l" + d.from + "l" + d.to;
                if (!(classname in window.clickedArrows))
                {
                    d3.select(this).classed("summaryArowHovered", false);
                    d3.selectAll("path." + classname).classed("diffEdgeHidden", true);
                    d3.select(this).selectAll("line").attr("marker-end", "url(#arrow)");
                }

            });



            var summaryArrow = visualization.root.selectAll("g.summaryArrow").data(sortedArrowsArray).enter().append("g")
                // .classed("summaryArrow",true)
                .attr("class", function(d)
                {
                    var classname = "l" + d.from + "l" + d.to;
                    return "summaryArrow " + classname;
                });

            summaryArrow.append("path").attr("d", function(t)
            {
                // Render the edge itself taking in account its length.
                var r = visParams.objectMaxSize / 2 + 3;
                var a = {
                    x: 0,
                    y: r
                };
                var b = {
                    x: Math.abs(t.toY - t.fromY) - r,
                    y: 0
                };
                var c = {
                    x: 0,
                    y: -r
                };
                // Modifying for having an arrow head
                return "M" + a.x + "," + a.y + " L" + b.x + "," + b.y + " L" + (b.x - 9) + "," + (b.y - 5) + " L" + (b.x - 9) + "," + (b.y + 5) + " L" + b.x + "," + b.y + " L" + c.x + "," + c.y + " A" + r + "," + r + " 0 0,1 " + a.x + "," + a.y;

            }).attr("transform", function(t, i)
            {
                // Rotate and position the edge on the visualization.
                var degrees = Math.atan2((t.toY - t.fromY), 0) / Math.PI * 180;
                var rotate = "rotate(" + degrees + ",0,0)";

                var translate = "translate(" + (rightMostX + i * paddingBetweenArrows) + "," + t.fromY + ")";
                return translate + rotate;
            }).attr(
            {
                stroke: 2
                // fill: "url(#objectDiffEdgeGradient)",
                // style: "pointer-events: none;fill-opacity:"+visParams.diffEdgeFillOpacity

            });

            // summaryArrow.append("line")
            //     .attr("x1", function(d,i){
            //         return rightMostX + i*paddingBetweenArrows;
            //     })
            //     .attr("y1", function(d){return d.fromY;})
            //     .attr("x2", function(d,i){
            //         return rightMostX + i*paddingBetweenArrows;
            //     })
            //     .attr("y2", function(d){return d.toY})
            //     .attr("style",function(d){
            //         var val = d.value;
            //         var ratio = (val-minValue)/(maxValue-minValue);
            //         var wid = ratio * (maxWidth-minwidth)  + minwidth;
            //         // console.log(minValue, maxValue, val,ratio,wid);
            //         // stroke:rgb(204,204,204);
            //         return "stroke-width:"+wid ;                        
            //     })
            //     .attr("marker-end","url(#arrow)");


            summaryArrow.append("circle")
                .attr("cx", function(d, i)
                {
                    return rightMostX + i * paddingBetweenArrows;
                })
                .attr("cy", function(d)
                {
                    return d.fromY
                })
                .attr("r", circleRadius)
                // .attr("stroke","#cccccc")
                .attr("stroke-width", function(d)
                {
                    var val = d.value;
                    var ratio = (val - minValue) / (maxValue - minValue);
                    var wid = ratio * (maxWidth - minwidth) + minwidth;
                    return wid;
                })
                .attr("fill", "white");

            summaryArrow.append("text")
                .attr("x", function(d, i)
                {
                    return rightMostX + i * paddingBetweenArrows;
                })
                .attr("y", function(d)
                {
                    return d.fromY
                })
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#cccccc")
                .text(function(d)
                {
                    return d.value
                });

            for (var k in window.clickedArrows)
            {
                var classname = "l" + window.clickedArrows[k][0] + "l" + window.clickedArrows[k][1];
                d3.selectAll("path." + classname).classed("diffEdgeHidden", false);
                d3.selectAll("g." + classname).classed("summaryArowHovered", true);
                d3.selectAll("g." + classname).selectAll("line").attr("marker-end", "url(#arrowhighlighted)");
            }

            summaryArrow.on("mouseover", function(d)
            {
                // console.log(d);
                var classname = "l" + d.from + "l" + d.to;
                d3.selectAll("path." + classname).classed("diffEdgeHidden", false);
                d3.select(this).classed("summaryArowHovered", true);
                d3.select(this).select("line").attr("marker-end", "url(#arrowhighlighted)");
            })
            summaryArrow.on("click", function(d)
            {
                // console.log(d);
                d3.event.stopPropagation();

                var classname = "l" + d.from + "l" + d.to;
                // console.log(window.clickedArrows);
                if (!(classname in window.clickedArrows))
                {
                    // delete window.clickedArrows[classname];
                    // d3.select(this).classed("summaryArowHovered",false);
                    d3.selectAll(".summaryArowHovered").classed("summaryArowHovered", false);

                    for (var edge in window.clickedArrows)
                        d3.selectAll("path." + edge).classed("diffEdgeHidden", true);
                    // d3.select(this).select("line").attr("marker-end","url(#arrow)");

                    window.clickedArrows = {};
                    delete window.objects["move"];
                    updateListWithCurrentSelection();
                    d3.select(".move").remove();


                    window.clickedArrows[classname] = [d.from, d.to];
                    d3.selectAll("path." + classname).classed("diffEdgeHidden", false);
                    d3.select(this).classed("summaryArowHovered", true);
                    d3.select(this).select("line").attr("marker-end", "url(#arrowhighlighted)");
                    window.selectedSummayArrowClassName = classname;
                    var tempoidDict = {};
                    for (var g = 0; g < d.objectIds.length; g++)
                        tempoidDict[d.objectIds[g]] = 1;
                    window.objects["move"] = tempoidDict;
                    window.arrowFrom = d.from;
                    window.arrowTo = d.to;
                    addTimestepTag([d.from, d.to], "move", "move");
                }
                else
                {
                    delete window.clickedArrows[classname];
                    d3.select(this).classed("summaryArowHovered", false);
                    d3.selectAll("path." + classname).classed("diffEdgeHidden", true);
                    d3.select(this).select("line").attr("marker-end", "url(#arrow)");

                    window.clickedArrows = {};
                    delete window.objects["move"];
                    updateListWithCurrentSelection();
                    d3.select(".move").remove();
                }
                // updateObjectListWithSelection(d.objectIds, false, true);
                d3.event.stopPropagation();
                // console.log(window.clickedArrows);


            })
            summaryArrow.on("mouseup", function(d)
            {
                window.clickAndDragged = false;
                window.isSVGRequiredToHandleClickInWhiteArea = false;
                // d3.event.stopPropagation();
            });

            summaryArrow.on("mouseout", function(d)
            {
                // console.log(d);
                var classname = "l" + d.from + "l" + d.to;
                if (!(classname in window.clickedArrows))
                {
                    d3.select(this).classed("summaryArowHovered", false);
                    d3.selectAll("path." + classname).classed("diffEdgeHidden", true);
                    d3.select(this).select("line").attr("marker-end", "url(#arrow)");
                }

            });
        }

        function computeSummaryVerticalArrowsForTaperedEdges(diffedgearray, lattice)
        {
            var summaryDictionary = {};
            for (var i = 0; i < diffedgearray.length; i++)
            {
                var fromConceptId = diffedgearray[i].from.conceptId;
                var toConceptId = diffedgearray[i].to.conceptId;
                var fromlayerNum = getLayerNum(fromConceptId, lattice);
                var tolayerNum = getLayerNum(toConceptId, lattice);
                if (fromlayerNum in summaryDictionary)
                {
                    if (tolayerNum in summaryDictionary[fromlayerNum])
                    {

                        summaryDictionary[fromlayerNum][tolayerNum].value++;
                        summaryDictionary[fromlayerNum][tolayerNum].objectIds.push(diffedgearray[i].from.objectId);
                    }
                    else
                    {
                        summaryDictionary[fromlayerNum][tolayerNum] = {
                            "value": 1,
                            "objectIds": [diffedgearray[i].from.objectId]
                        }
                        // summaryDictionary[fromlayerNum][tolayerNum].value =1;
                    }
                }
                else
                {
                    var temp = {};
                    temp[tolayerNum] = {};
                    temp[tolayerNum]["value"] = 1;
                    temp[tolayerNum]["objectIds"] = [diffedgearray[i].from.objectId];
                    summaryDictionary[fromlayerNum] = temp;
                }
            }
            return summaryDictionary;
        }

        function getLayerNum(conceptId, lattice)
        {
            return lattice.concepts[conceptId].layer;
        }
        /////////////////////// Interactivity ///////////////////////
        // Check whether we should enable interaction.
        if (!visualization.isInteractive) return;
        // Should be filled in with information about the edge: source, target, coords, etc.
        // ObjectDiffEdge is also called a "transition edge".
        var objectDiffEdge = null;
        if (visualization.type == "diff")
        {
            objectDiffEdge = computeObjectDiffEdgeVisuals(visualization, conceptList, selectedObjectEdges, versionA, versionB);
            // console.log(objectDiffEdge);
            if (objectDiffEdge != null)
                d3.select("#diff" + objectDiffEdge.from.objectId).classed("diffEdgeHidden", false);
        }
        // Render the 'object diff edge'. (if it is needed)
        selections.objectDiffEdgeUpdate = visualization.root.selectAll("path.objectDiffEdge").data(objectDiffEdge != null ? [objectDiffEdge] : []);
        selections.objectDiffEdgeUpdate.enter().append("path").classed("objectDiffEdge", true);
        // selections.objectDiffEdgeUpdate.exit().remove();
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
            style: "pointer-events: none;fill-opacity:" + visParams.diffEdgeFillOpacity

        });
        // Enable tooltips
        window.tooltip = d3.tip().direction("s").attr("class", "d3-tip").html(function(d)
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
                weight = "[" + weightA + "/";
                weight += +weightB + "]";
                weight = weight + " " + name;
            }
            else
            {
                throw new Error("Invalid visualiation type");
            }
            return weight;
        });

        window.conceptTooltip = d3.tip().attr("class", "d3-tip").html(function(d)
        {
            return d;
        });

        visualization.svgCanvas.call(tooltip);
        visualization.svgCanvas.call(conceptTooltip);
        // Register event handlers for direct interaction.
        // Schedulers are used to schedule and cancel callbacks,
        // which is necessary to prevent flickering of the visualization.
        // The flickering results from the fact that hovering over contained objects
        // triggers a mouseOut event for the container. We schedule a deselection,
        // but abort it if a contained object received a mouseover event meaning
        // that the mouse is still inside the container.
        window.objectSelectionScheduler = new Scheduler(300);
        for (var i = 0; i < conceptList.length; i++)
        {
            conceptList[i].scheduler = new Scheduler(300);
        }
        selections.conceptCreate.selectAll("rect")
            // .on("mouseover", function(d)
            // {
            //     d3.event.stopPropagation();
            //     window.clearFocussedConceptEdges = false;
            //     d.scheduler.run(function()
            //     {
            //         visualization.isSelectionActive = true;
            //         visualization.focusedConcept = d;

            //         d.isFocused = true;
            //         // console.log(d);
            //         rerender();
            //     });

            // }).on("mouseout", function(d)
            // {
            //     d3.event.stopPropagation();
            //     window.clearFocussedConceptEdges = true;
            //     if (objectSelectedInObjectListBoolean)
            //     {
            //         visualization.focusedObject = selectedObjectId;
            //         // mainVisualization.focusedObject = object.id;
            //         visualization.isSelectionActive = true;
            //         rerender();
            //         // render(lattice, currentVersion, visualization, false, true);
            //     }
            //     else
            //     {
            //         d.scheduler.run(function()
            //         {
            //             visualization.isSelectionActive = false;
            //             visualization.focusedConcept = null;

            //             d.isFocused = false;
            //             rerender();
            //         });
            //     }
            // })
            .on("click", function(d)
            {
                d3.event.stopPropagation();
                if (window.selectedConceptIdForHighlight.indexOf(d.id)<0)
                {
                    window.selectedConceptIdForHighlight.push(d.id);
                    highlightBars(d.id, currentVersion);
                    render(lattice, currentVersion, visualization, true, false);
                    render(lattice, currentVersion, visualization, true, false);
                    var arrayoid = {};
                    for (var g = 0; g < d.objectsFiltered.length; g++)
                        arrayoid[d.objectsFiltered[g].objectId] = 1;
                    if(!("conceptSelection" in window.objects))
                        window.objects["conceptSelection"] = {};
                    window.objects["conceptSelection"][d.id] = arrayoid;
                    addTimestepTag(currentVersion, "conceptSelection", "conceptSelection");
                }
                else
                {
                    d3.select(".tcid"+d.id).remove();
                    window.selectedConceptIdForHighlight.splice(window.selectedConceptIdForHighlight.indexOf(d.id), 1);
                    delete window.objects["conceptSelection"][d.id];

                    // window.selectedConceptIdForHighlight = -1;
                    if(window.selectedConceptIdForHighlight.length ==0)
                    {    
                        mainVisualization.focusedConcept = null;
                        delete window.objects["conceptSelection"];
                    }
                    d3.select("rect.id"+d.id).attr("style", "stroke-opacity:0;");

                    d3.selectAll(".individualVersionNavigationBars").classed("barClicked", false);

                    updateListWithCurrentSelection();
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
            if (guiParams.shape === "circle")
            {
                var start = polarToCartesian(x, y, radius, endAngle);
                var end = polarToCartesian(x, y, radius, startAngle);
                var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
                var d = ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
                return d;
            }
            else if (guiParams.shape === "square")
            {
                var start = polarToCartesian(x, y, radius, endAngle);
                var end = polarToCartesian(x, y, radius, startAngle);
                var largeArcFlag = endAngle - startAngle <= 180 ? -1 : 1;
                var d = ["M", x + largeArcFlag, y, "h", largeArcFlag * visParams.objectMaxSize].join(" ");
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
            // console.log(object.id);
            // Abort any handlers scheduled by the concept.
            concept.scheduler.stop();
            concept.isFocused = true;
            // Schedule an object selection.
            objectSelectionScheduler.run(function()
            {
                rerender();
                d3.event = e;
                // d3.selectAll(".d3-tip").remove();
                tooltip.show(d);
            });
        }).on("click", function(d)
        {
            // var e = d3.event;
            d3.event.stopPropagation()
            var objectEdge = d;
            var object = lattice.objects[objectEdge.objectId];
            if (visualization.focusedObject != object.id)
            {

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
            }
            else
            {
                mainVisualization.focusedObject = null;
                mainVisualization.isSelectionActive = false;
                objectSelectedInObjectListBoolean = false;
                dataTableObject.rows('.selected').nodes().to$() // Convert to a jQuery object
                    .removeClass('selected');
                render(lattice, currentVersion, mainVisualization, false, false);
            }
        })
        .on('contextmenu', function(d,i){ 
            d3.event.preventDefault();
            if(window.paperDetailsPresent)
                listOfPapers(window.selectedVersions, window.allLattice.objects[d.objectId].name);
            else
                alert("Paper details not preent");
        })
        .on("mouseout", function(d)
        {
            var e = d3.event;
            d3.selectAll(".d3-tip").remove();

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
        // $(document).ready(function(){
            // $('[data-toggle="tooltip"]').tooltip( {delay: { "show": 0, "hide": 0 }});   
        // });
    }

    function highlightBars(cid, currentVersion)
    {
        if (cid <= 0) return;
        d3.selectAll(".individualVersionNavigationBars").classed("barClicked", false);
        for (var v of currentVersion)
        {
            $(".bar" + cid).filter(".barVersion" + v).addClass("barClicked");
        }
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

            function sortFunc(a, b)
            {
                // var sortingArr = [ 'b', 'c', 'b', 'b', 'c', 'd' ];
                //   
                if (window.orderBy == "weight")
                {
                    var sum1 = 0;
                    var sum2 = 0;
                    for (var ver in a.weights)
                    {
                        if (window.selectedVersions != undefined && window.selectedVersions.indexOf(parseInt(ver)) > -1)
                            sum1 += a.weights[ver];
                    }
                    for (var ver in b.weights)
                    {
                        if (window.selectedVersions != undefined && window.selectedVersions.indexOf(parseInt(ver)) > -1)
                            sum2 += b.weights[ver];
                    }
                    return sum2 - sum1;
                }
                else if (window.orderBy == "list")
                {
                    return dataTableArray.indexOf(a.objectId) - dataTableArray.indexOf(b.objectId);
                }
                else if (window.orderBy == "type")
                {
                    if (window.selectedVersions != undefined)
                    {

                        if (window.selectedVersions.length == 1)
                        {
                            var aIsExclusive = checkExclusive(a, window.selectedVersions, "individual");
                            var bIsExclusive = checkExclusive(b, window.selectedVersions, "individual");
                            if (aIsExclusive == bIsExclusive)
                            {
                                var sum1 = 0;
                                var sum2 = 0;
                                for (var ver in a.weights)
                                {
                                    if (window.selectedVersions.indexOf(parseInt(ver)) > -1)
                                        sum1 += a.weights[ver];
                                }
                                for (var ver in b.weights)
                                {
                                    if (window.selectedVersions.indexOf(parseInt(ver)) > -1)
                                        sum2 += b.weights[ver];
                                }
                                return sum2 - sum1;
                            }
                            else
                                return bIsExclusive - aIsExclusive;
                        }
                        else if (window.selectedVersions.length > 1 && window.selectedVersions.length == window.allVersions.length && window.selectedType == "aggregate")
                        {
                            var aIsExclusive = checkExclusive(a, window.selectedVersions, "agg");
                            var bIsExclusive = checkExclusive(b, window.selectedVersions, "agg");
                            if (aIsExclusive == bIsExclusive)
                            {
                                var sum1 = 0;
                                var sum2 = 0;
                                for (var ver in a.weights)
                                {
                                    if (window.selectedVersions.indexOf(parseInt(ver)) > -1)
                                        sum1 += a.weights[ver];
                                }
                                for (var ver in b.weights)
                                {
                                    if (window.selectedVersions.indexOf(parseInt(ver)) > -1)
                                        sum2 += b.weights[ver];
                                }
                                return sum2 - sum1;
                            }
                            else
                                return bIsExclusive - aIsExclusive;
                        }
                        else if (window.selectedVersions.length == 2 && window.selectedType == "diff")
                        {
                            var aPresence = checkPresence(a, window.selectedVersions, "diff");
                            var bPresence = checkPresence(b, window.selectedVersions, "diff");
                            if (aPresence == bPresence)
                            {
                                var sum1 = 0;
                                var sum2 = 0;
                                for (var ver in a.weights)
                                {
                                    if (window.selectedVersions.indexOf(parseInt(ver)) > -1)
                                        sum1 += a.weights[ver];
                                }
                                for (var ver in b.weights)
                                {
                                    if (window.selectedVersions.indexOf(parseInt(ver)) > -1)
                                        sum2 += b.weights[ver];
                                }
                                return sum2 - sum1;
                            }
                            else
                                return aPresence - bPresence;
                        }
                    }
                }
            }

            concept.objectsFiltered = concept.objectsFiltered.sort(sortFunc);
        }
        return conceptsFiltered;
    }

    // Check presence of object among two timesteps. 
    // Only in previous return 0
    // Only in next timestep - return 1
    // In both timesteps - return 2
    function checkPresence(object, selectedVersions, type)
    {
        if (type == "diff")
        {
            var objectid = object.objectId;
            var conceptid = object.conceptId;
            var selectedVersionA = window.selectedVersions[0];
            var selectedVersionB = window.selectedVersions[1];
            var returnResult = -1;
            // if (window.allLattice.concepts[conceptid].layer == window.allLattice.objects[objectid].highestLayerInfo[selectedVersions[0]])
            //     return 1;
            // else return 0;
            if ((selectedVersionA in object.weights) && !(selectedVersionB in object.weights))
                returnResult = 0;
            else if (!(selectedVersionA in object.weights) && (selectedVersionB in object.weights))
                returnResult = 1;
            else if ((selectedVersionA in object.weights) && (selectedVersionB in object.weights))
                returnResult = 2;

            return returnResult;
        }
    }

    // return: 0 if not exclusive, 1 if it is exclusive
    function checkExclusive(object, selectedVersions, type)
    {
        if (type == "individual")
        {
            var objectid = object.objectId;
            var conceptid = object.conceptId;
            if (window.allLattice.concepts[conceptid].layer == window.allLattice.objects[objectid].highestLayerInfo[selectedVersions[0]])
                return 1;
            else return 0;
        }
        else if (type == "agg")
        {
            var objectid = object.objectId;
            var conceptid = object.conceptId;
            if (window.allLattice.concepts[conceptid] == undefined)
                console.log(object, conceptid, window.allLattice);
            if (window.allLattice.concepts[conceptid].layer == window.allLattice.objects[objectid].highestLayerNumberInAggregateLattice)
                return 1;
            else return 0;
        }
        else if (type == "diff")
        {
            // console.log(selectedVersions);
            var objectid = object.objectId;
            var conceptid = object.conceptId;
            // if(objectid == 1301818069)
            // {
            //     console.log(selectedVersions, object,  window.allLattice.objects[objectid].highestLayerInfo );
            //     console.log(window.allLattice.concepts[conceptid].fullName, window.allLattice.concepts[conceptid].layer == window.allLattice.objects[objectid].highestLayerInfo[selectedVersions[0]]);
            // }
            if (window.allLattice.concepts[conceptid].layer == window.allLattice.objects[objectid].highestLayerInfo[selectedVersions[0]])
                return 1;
            else return 0;
        }

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
            window.layerHeights = layerHeights;
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
        bbox.x1 -= 300;

        if (visParams.legendBoundingBox.x < bbox.x1)
            bbox.x1 = visParams.legendBoundingBox.x
        if (visParams.legendBoundingBox.y < bbox.y1)
            bbox.y1 = visParams.legendBoundingBox.y

        var newCenter = {
            x: (bbox.x1 + bbox.x2) / 2,
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
        visualization.fieldOfView.y = bbox.y1 - margin - 5;
        visualization.fieldOfView.width = bbox.x2 - bbox.x1 + 2 * margin + 2 * visParams.legendBoundingBox.width;
        visualization.fieldOfView.height = bbox.y2 - bbox.y1 + 2 * margin;
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
                    // console.log(objectEdge.objectId, visualization.focusedObject, objectEdge.objectId === visualization.focusedObject, selectedObjectEdges);
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
    /*
        Function to compute selectedObjectEdges that should be shown without any selection 
    */
    function addSelectionInformationAndFindSelectedObjects2(visualization, conceptList, conceptEdgeList, selectedConcepts)
    {
        var selectedObjectEdges = [];
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
                // if (objectEdge.isSelected)
                {
                    // Save the parent concept. (will need it for rendering obj.diff. edge later)
                    objectEdge.conceptId = concept.id;
                    selectedObjectEdges.push(objectEdge);
                }
            }

        }

        var alldiffedges = [];
        var objectPresenceDict = {};
        for (var i = 0; i < selectedObjectEdges.length; i++)
        {
            if (selectedObjectEdges[i]["objectId"] in objectPresenceDict)
            {
                objectPresenceDict[selectedObjectEdges[i]["objectId"]].push(selectedObjectEdges[i]);
            }
            else
            {
                objectPresenceDict[selectedObjectEdges[i]["objectId"]] = [selectedObjectEdges[i]];
            }

            // for (var j=0; j<selectedObjectEdges.length; j++)
            // {
            //     if(selectedObjectEdges[i]["objectId"] == selectedObjectEdges[j]["objectId"] && selectedObjectEdges[i]["conceptId"] !=  selectedObjectEdges[j]["conceptId"])
            //     {
            //         if((selectedObjectEdges[i]["version"] & selectedObjectEdges[j]["version"]) >0 )
            //         {
            //             var temp = [];
            //             temp.push(selectedObjectEdges[i]);
            //             temp.push(selectedObjectEdges[j]);
            //             alldiffedges.push(temp);
            //         }
            //     }
            // }
        }
        // console.log(objectPresenceDict);
        return objectPresenceDict;


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
        for (var layer = minLayer; layer <= maxLayer; layer++)
        {
            currentHeight += layerHeights[layer + ""] ? layerHeights[layer + ""] : visParams.minLayerHeight;
            var separatorY = visParams.bottomY - currentHeight - visParams.layerMargin / 2;
            if (layer == 1)
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
        // console.log(selectedObjectEdges);
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
    /*
        Function to precompute tapered edges without any selection
    */
    function computeObjectDiffEdgeVisuals2(visualization, conceptList, selectedObjectEdges, versionA, versionB)
    {
        var objectDiffEdge = {};
        // console.log(selectedObjectEdges);
        // If a selection has been made, render the 'object diff edge'.
        if (selectedObjectEdges.length > 1)
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
            // if(edgeCanBeDrawn)
            //     console.log(selectedObjectEdges[0]["objectId"], edgeA, edgeB);
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