function drawVisualization()
{
    var leftPadding = 0,
    rightPadding = 20,
        topPadding = 115,
        bottomPadding = 20,
        width = 1800,
        svgHeight = 1000,
        height = 600,
        textEnd = 170;
    var tableTop = 30;

    // width = d3.select("#mainDiv").node().getBoundingClientRect().width;
    width = 1920;
    // svgHeight = window.innerHeight * 0.7;
    svgHeight = 850;
    var videoFiles = ["videos/p1_train.mp4", "videos/p1_test.mp4", "videos/p5_train.mp4", "videos/p5_test.mp4", "videos/p11_train.mp4", "videos/p11_test.mp4"];

    var paddingBetweenColumns = 15;    
    var radiusOfCircle = 6;
    var glyphOPacity = 0.5;
    var marginTextBeforeMatrix = 15;
    window.videoIndexBeingPlayed = 1;

    var svg = d3.select("#mainVisualization").attr("width", width).attr("height", svgHeight);
    
    var eventNameArray = Object.keys(eventTypesDict);
    var counter = 0;
    // eachColumn = (width)/5;
    eachColumn = 435;
    window.entities2 = window.entities2.sort();

    var yscale =  d3.scaleBand()
                    .domain(window.entities2)
                    .rangeRound([topPadding, height- bottomPadding])
                    .padding(5);  

    var heightOfRow = yscale(entities2[1]) - yscale(entities2[0]);

    var colors = [ '#ec6502', '#1a8e6a', '#6762a2',  '#0E1EF1']; //'#7cc522',  '#eb298d',
    var yLegendGroup = svg.append("g");
    for(var i=0; i<entities2.length; i++)
    {
        yLegendGroup.append("text").attrs({
            "x": textEnd-marginTextBeforeMatrix,
            // "x": 0,
            "y": yscale(entities2[i]),
            "class": "yLegend"
        }).text(function(){
            var temp = entities2[i];
            temp = temp.replace("ESS-ENVIRONMENT", "Location1");
            temp = temp.replace("MUC-ENVIRONMENT", "Location2");
            if(temp == "Location1-OBJ-107")
                temp = "Location1-Blank-1";
            else if(temp == "Location1-OBJ-108")
                temp = "Location1-Blank-2";
            else if(temp == "Location2-OBJ-7")
                temp = "Location2-Blank-1";
            else if(temp == "Location2-OBJ-8")
                temp = "Location2-Blank-2";
            return temp;
        })

        yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd - textEnd/2,
                        "y1": yscale(entities2[i]) + heightOfRow/2,
                        "x2": width,
                        "y2": yscale(entities2[i]) + heightOfRow/2,
                        "stroke":"lightgray",

                        "opacity": 0.5,
                        "stroke-width":"1px"
                    })

    }

    yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd,
                        "y1":(topPadding-2*tableTop),
                        "x2":  width,
                        "y2": (topPadding-2*tableTop),
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
    yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd,
                        "y1":(topPadding-tableTop),
                        "x2":  width,
                        "y2": (topPadding-tableTop),
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
    yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd,
                        "y1":(topPadding),
                        "x2":  width,
                        "y2": (topPadding),
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
    var lastRowBottomEdgeYLoacation = yscale(entities2[entities2.length -1]) + heightOfRow/2;
    yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd,
                        "y1":lastRowBottomEdgeYLoacation,
                        "x2":  width,
                        "y2":lastRowBottomEdgeYLoacation,
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });


    var eventLegendGroup = svg.append("g");
    var distanceBetweenCircles = (width - textEnd)/(eventNameArray.length + 1);
    // var distanceBetweenCircles = 1000;
    for(var i=0; i<eventNameArray.length; i++)
    {
        if(eventNameArray[i] == "MovementAction")
        {
            eventLegendGroup.append("rect").attrs({
                "x": textEnd + i*distanceBetweenCircles - radiusOfCircle,
                "y": (topPadding-2*tableTop)/2 - heightOfRow/2,
                "width": 2*radiusOfCircle,
                "height": heightOfRow,
                "fill-opacity":glyphOPacity,
                fill:function(){
                    return colors[i];
                }
            });
        }
        else
        {
            eventLegendGroup.append("circle").attrs({
                cx: textEnd + i*distanceBetweenCircles,
                cy: (topPadding-2*tableTop)/2,
                r: 2*radiusOfCircle,
                "fill-opacity":glyphOPacity,
                fill:function(){
                    return colors[i];
                }
            });
        }
        
        eventLegendGroup.append("text").attrs({
            x: textEnd + i*distanceBetweenCircles + 2*radiusOfCircle + 5,
            y: (topPadding-2*tableTop)/2,
            "dominant-baseline":"middle"
        }).text(function(){
            if(eventNameArray[i] == "MovementAction")
                return "Movement Action (width = duration)";
            else if (eventNameArray[i] == "NewInstruction")
                return "New Instruction";
            else if (eventNameArray[i] == "FinishInstruction")
                return "Finish Instruction";
            else if (eventNameArray[i] == "CancelInstruction")
                return "Cancel Instruction";
        });
    }


    // var timestepLegend = svg.append("g");
    // timestepLegend.append("line").attrs({
    //     x1: textEnd,
    //     y1: height- bottomPadding,
    //     x2: width - rightPadding,
    //     y2: height- bottomPadding,
    //     stroke: "gray",
    //     "stroke-width": "1px",
    //     "marker-end":"url(#arrow)"
    // });
    // timestepLegend.append("text").attrs({
    //     x: (width- textEnd)/2 + textEnd,
    //     y: height - bottomPadding/2,
    //     "dominant-baseline":"middle",
    //     fill:"black"
    // }).text("Time");


    var maximumDuration = 297*1000;

    var maximumNumberOfEventsInBin = 0;
    var allDensityDataArray = [];

    var localxScale = d3.scaleLinear().domain([0, maximumDuration]).range([0, eachColumn]);
    xPosition = textEnd;

    window.tableLocations = {};
    window.durationDict = {};
    for(var participant in eventData2)
    {
        for(var phase in eventData2[participant])
        {
            counter +=1;
            eventData = eventData2[participant][phase]["data"]
            start = eventData2[participant][phase]["start"]
            end = eventData2[participant][phase]["end"]
            duration = eventData2[participant][phase]["duration"]

            durationDict[counter] = {};
            durationDict[counter]["start"] = start;
            durationDict[counter]["end"] = end;
            durationDict[counter]["duration"] = duration;


            var minTimestamp = eventData2[participant][phase]["start"];
            var maxTimestamp = eventData2[participant][phase]["end"];
            var localDuration = maxTimestamp - minTimestamp;
            // var xscale = d3.scaleLinear().domain([minTimestamp, maxTimestamp]).range([textEnd + (counter-1)*eachColumn + paddingBetweenColumns, (counter)*eachColumn]);
            if(counter%2 ==1)
                paddingBetweenColumns = 0;
            else
                paddingBetweenColumns = 0;

            xstart = xPosition;
            tableLocations[counter] = {"start": xstart};
            xend = xstart + localxScale(localDuration);
            temp = (eachColumn- (xend - xstart))/2;
            var padStartLeft = 0;

            // console.log("counter: ",counter,", ", xstart,", " ,xend, ", ",localDuration, ", maxDuration:",maximumDuration);
            var xscale = d3.scaleLinear().domain([minTimestamp, maxTimestamp]).range([padStartLeft+xstart, padStartLeft + xend]);
            
            

            var dataPlot = svg.append("g");
            
            var binForDensity = 6000;
            var eventDensityData = [];
            var currentTimestep = -1;
            var previousTimestep = -1;
            
            var tempdict = { "events": JSON.parse(JSON.stringify(eventTypesDict)) };
            for(var event in tempdict["events"])
                tempdict["events"][event] = 0;

            var tempDictPerBin = {};
            // if(counter ==5)
            //     console.log(eventData[0]["start"], (eventData[eventData.length -1]["start"]+ binForDensity));

            for(var j=eventData[0]["start"]; j<= (eventData[eventData.length -1]["start"]+ binForDensity); j=j+binForDensity)
            {
                tempDictPerBin = JSON.parse(JSON.stringify(tempdict));
                tempDictPerBin["start"] = j;
                tempDictPerBin["end"] = j + binForDensity;
                tempDictPerBin["duration"] = binForDensity;
                tempDictPerBin = countEventsInBin(j, j+binForDensity, binForDensity, eventData, tempDictPerBin );
                var sum = 0;
                for(var eve in tempDictPerBin["events"])
                {
                    sum += tempDictPerBin["events"][eve];
                }
                tempDictPerBin["sum"] = sum;
                if(sum > maximumNumberOfEventsInBin)
                        maximumNumberOfEventsInBin = sum;


                eventDensityData.push(tempDictPerBin);
                // for(var eve in tempDictPerBin["events"])
                // {
                //     if(tempDictPerBin["events"][eve] > maximumNumberOfEventsInBin)
                //         maximumNumberOfEventsInBin = tempDictPerBin["events"][eve];
                // }
               
            }
            // console.log(eventData);
            // console.log(eventDensityData);
            allDensityDataArray.push(eventDensityData);
           

            // for(var i=0; i<eventData.length; i++)
            // {
            //     currentTimestep = eventData[i]["start"];
            //     if(i==0)
            //     {
                    
            //         previousTimestep = currentTimestep;
            //         tempDictPerBin = JSON.parse(JSON.stringify(tempdict));
            //         tempDictPerBin["events"][eventData[i]["type"]] +=1;
            //     }
            //     else
            //     {
            //         if((currentTimestep - previousTimestep) <= binForDensity)
            //         {
            //             tempDictPerBin["events"][eventData[i]["type"]] +=1;
            //         }
            //         else
            //         {
            //             tempDictPerBin["start"] = previousTimestep;
            //             tempDictPerBin["end"] = eventData[i-1]["start"];
            //             tempDictPerBin["duration"] = eventData[i-1]["start"]-previousTimestep;


            //             eventDensityData.push(tempDictPerBin);
            //             previousTimestep = currentTimestep;
            //             tempDictPerBin = JSON.parse(JSON.stringify(tempdict));
            //             tempDictPerBin["events"][eventData[i]["type"]] +=1;
            //         }
            //     }
            // }
            // console.log(eventDensityData);

            for(var i=0; i<eventData.length; i++)
            {
                var objects = eventData[i]["entities"];
                if(objects.length == 2)
                {
                    // if(eventData[i]["condition"] == "INSTRUCTION_BY_CONTROLLER")
                    //     temp = "Controller (left)";
                    // else
                        temp = objects[0];
                    var dy1 = yscale(temp);
                    var dy2 = yscale(objects[1]);

                    if(dy1>dy2)
                    {
                        dy1 = dy1-radiusOfCircle;
                        dy2 = dy2 + radiusOfCircle;
                    }
                    else
                    {
                        dy1 = dy1+ radiusOfCircle;
                        dy2 = dy2 - radiusOfCircle;
                    }
                    for(var j=0; j<objects.length; j++)
                    {
                        dataPlot.append("circle")
                            .attrs({
                                cx: function(){ return xscale(eventData[i]["start"]); },
                                cy: function(){ 
                                        temp = objects[j];
                                    if(j==0)
                                        return yscale(temp); 
                                    else
                                        return yscale(objects[j]);
                                },
                                r: radiusOfCircle,
                                "fill-opacity":glyphOPacity,
                                fill:function(){

                                    var index = eventNameArray.indexOf(eventData[i]["type"]);
                                    return colors[index];
                                }
                            }).append("svg:title").text(function(){
                                return eventData[i]["type"];
                            })
                        
                    }
                    dataPlot.append("line")
                        .attrs({
                            x1: function(){ return xscale(eventData[i]["start"]); },
                            x2: function(){ return xscale(eventData[i]["start"]); },
                            y1: dy1,
                            y2: dy2,
                            "stroke-width": "1px",
                            "stroke":"black",
                            "opacity":glyphOPacity
                        })
                }

                else if(eventData[i]["type"] == "MovementAction")
                {
                    dataPlot.append("rect")
                                .attrs({
                                    "x":function(){ return xscale(eventData[i]["start"]) ; },
                                    "y": function(){return yscale(objects[0])- heightOfRow/2 },
                                    "width": function(){
                                        x1 = xscale(eventData[i]["start"]);
                                        x2 = xscale(eventData[i]["end"])
                                        return Math.abs(x2-x1);
                                    },
                                    "height": function(){
                                        return heightOfRow;
                                        //  yscale.bandwidth()
                                    },
                                    "fill-opacity":glyphOPacity,

                                    "fill":function(){
                                                var index = eventNameArray.indexOf(eventData[i]["type"]);
                                                return colors[index];
                                            }
                                }).append("svg:title").text(function(){
                                    return eventData[i]["type"];
                                })
                }

                else
                {
                    for(var j=0; j<objects.length; j++)
                    {
                        dataPlot.append("circle")
                            .attrs({
                                cx: function(){ return xscale(eventData[i]["start"]); },
                                cy: function(){ 
                                        temp = objects[j];
                                    if(j==0)
                                        return yscale(temp); 
                                    else
                                        return yscale(objects[j]);
                                },
                                r: radiusOfCircle,
                                "fill-opacity":glyphOPacity,
                                fill:function(){

                                    var index = eventNameArray.indexOf(eventData[i]["type"]);
                                    return colors[index];
                                }
                            }).append("svg:title").text(function(){
                                return eventData[i]["type"];
                            })
                        
                    }
                }
                
                
            }
            if(counter==1)
            { 
                dataPlot.append("line")
                    .attrs({
                        "x1": xPosition,
                        "y1":topPadding - 2*tableTop,
                        "x2":  xPosition,
                        "y2": lastRowBottomEdgeYLoacation,
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
            }
            
            
            xPosition = xend + radiusOfCircle;
            tableLocations[counter]["end"] = xPosition;

            if(counter%2==1)
            { 
                dataPlot.append("line")
                    .attrs({
                        "x1": xPosition,
                        "y1":topPadding - tableTop,
                        "x2":  xPosition,
                        "y2": lastRowBottomEdgeYLoacation,
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
            }
            else
            {
                dataPlot.append("line")
                    .attrs({
                        "x1": xPosition,
                        "y1":(topPadding-2*tableTop),
                        "x2":  xPosition,
                        "y2": lastRowBottomEdgeYLoacation,
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
                var paddingBetweenParticipants = 40;
                    
                dataPlot.append("rect")
                    .attrs({
                        "x": xPosition+1,
                        "y":(topPadding- 2*tableTop)-2,
                        "width":  function(){
                            if(counter != 6)
                                return paddingBetweenParticipants-2;
                            else
                                return width - xPosition;
                        },
                        "height": lastRowBottomEdgeYLoacation,
                        "stroke":"none",
                        // "stroke-dasharray":"5 5",
                        "fill":"white"
                    });
                if(counter<5)
                { 
                xPosition += paddingBetweenParticipants;
                dataPlot.append("line")
                    .attrs({
                        "x1": xPosition,
                        "y1":(topPadding- 2*tableTop),
                        "x2":  xPosition,
                        "y2": lastRowBottomEdgeYLoacation,
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });
               }
            }
        }
        


    }
    // console.log(tableLocations);
    for(var coun in tableLocations)
    {
        var tempstart = tableLocations[coun]["start"];
        var tempend = tableLocations[coun]["end"];
        svg.append("text").attrs({
            x: tempstart + (tempend-tempstart)/2 ,
            y: (topPadding-tableTop/2),
            "dominant-baseline":"middle",
            "text-anchor":"middle"
        }).text(function(){
            if(parseInt(coun) %2 ==1 )
                return "Scene 1";
            else
                return "Scene 2";
        });
        coun = parseInt(coun);
        if(coun %2 ==0 )
        {
            tempx = tableLocations[coun -1]["start"] + (tableLocations[coun]["end"] - tableLocations[coun -1]["start"])/2;
            svg.append("text").attrs({
                x: tempx,
                y: (topPadding-2*tableTop + tableTop/2),
                "dominant-baseline":"middle",
                "text-anchor":"middle"
            }).text(function(){
                return "Session "+coun/2 +" with participants P"+ (coun-1)+" and P"+ (coun);
            });
        }
        
    }
    var maxHeightOfHistogramBars = 50;

    for(var coun in tableLocations)
    {
        var tempstart = tableLocations[coun]["start"];
        var tempend = tableLocations[coun]["end"];
        svg.append("text")
            .attrs({
                "x": tempstart + (tempend - tempstart)/2,
                "y": (height - bottomPadding + maxHeightOfHistogramBars - 20),
                "text-anchor":"middle"
            }).text( durationDict[coun]["duration"]  + " seconds");
    }
    svg.append("text")
        .attrs({
            "x": textEnd - marginTextBeforeMatrix,
            "y": (height - bottomPadding + maxHeightOfHistogramBars - 20),
            "text-anchor":"end"
        }).text("Length of Scene:");


    
    for(var i=0; i< allDensityDataArray.length; i++)
    {
        var histogram = svg.append("g");

        var histogramXScale = d3.scaleLinear()
                            .domain([ allDensityDataArray[i][0]["start"], allDensityDataArray[i][allDensityDataArray[i].length -1]["start"]  ])
                            .range([tableLocations[i+1]["start"], tableLocations[i+1]["end"]] );
        var histogramYScale = d3.scaleLinear().domain([0, maximumNumberOfEventsInBin]).range([0, maxHeightOfHistogramBars]);
        
        var widthOfOneBar = histogramXScale(allDensityDataArray[i][1]["start"]) - histogramXScale(allDensityDataArray[i][0]["start"]);

    


        for(var j=0; j<allDensityDataArray[i].length; j++)
        {
            var d = allDensityDataArray[i][j];
            var bar = histogram.append("rect")
                        .attrs({
                            "x": histogramXScale(d["start"]),
                            "y": 0 - histogramYScale(d["sum"]),
                            "width":widthOfOneBar,
                            "height": histogramYScale(d["sum"]),
                            "fill":"gray"
                        })
            bar.append("svg:title").text(function(){
                            return "# events: "+d["sum"];
                        });
            // console.log(height - bottomPadding + maxHeightOfHistogramBars);
        }
        histogram.attr("style", "transform: translate(0px,"+(height - bottomPadding + 2*maxHeightOfHistogramBars) + "px);");
        
    }
    svg.append("text")
        .attrs({
            "x": textEnd - marginTextBeforeMatrix,
            "y": (height - bottomPadding + 2*maxHeightOfHistogramBars - 15),
            "text-anchor":"end"
        }).text("Event Histogram:");

    svg.append("text")
        .attrs({
            "x": textEnd - marginTextBeforeMatrix,
            "y": (height - bottomPadding + 2*maxHeightOfHistogramBars),
            "text-anchor":"end"
        }).text("(bin size: "+ (binForDensity/1000)+" seconds)");
    
    var heightOfWaveform = 50;

    svg.append("text")
        .attrs({
            "x": textEnd - marginTextBeforeMatrix,
            "y": (height - bottomPadding + 3*maxHeightOfHistogramBars + heightOfWaveform/2 + 5),
            "text-anchor":"end"
        }).text("Recorded Conversation:");
    
    imageFilenameArray = ["p1train.PNG", "p1test.PNG", "p5train.PNG", "p5test.PNG", "p11train.PNG", "p11test.PNG"];
    elementIdArray = ["p1Train", "p1Test", "p5Train", "p5Test", "p11Train", "p11Test"];
    

    

    

    for(var i=0; i< allDensityDataArray.length; i++)
    // for(var i=0; i< 4; i++)
    {
        svg.append("image")
            .attrs({
                "xlink:href": "images/"+imageFilenameArray[i],
                "x": tableLocations[i+1]["start"],
                "y": (height - bottomPadding + 3*maxHeightOfHistogramBars),
                "width": (tableLocations[i+1]["end"] - tableLocations[i+1]["start"]),
                "height": heightOfWaveform 
            });
        
        svg.append("image")
            .attrs({
                "xlink:href": "images/play.png",
                "x": tableLocations[i+1]["start"] + (tableLocations[i+1]["end"] - tableLocations[i+1]["start"])/2 ,
                "y":(height - bottomPadding + 3*maxHeightOfHistogramBars + heightOfWaveform + 5),
                "width": "30px",
                "height": "30px",
                "elementID": elementIdArray[i],
                "index": (i+1)

            }).on("click", function(){
                    var index = d3.select(this).attr("index");
                    window.videoIndexBeingPlayed = index;
                    // d3.select("#videoSource").attr("src", videoFiles[index-1]);

                    document.getElementById("video1").src = videoFiles[index-1];
                    document.getElementById("video1").load();

                    var myVideo = document.getElementById("video1");
                    playPause("video1");
                    // d3.select("#status").style("opacity", 1);
                    
                    // var sbar = d3.select("#status");
                    // var currentX = sbar.attr("x");
                    // if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
                    // {
                    //     var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
                    //     var dur = (currentX - tableLocations[index]["start"])/alpha;

                    //     d3.select("#status").attr("x", currentX)
                    //     .transition().duration((durationDict[index]["duration"] - dur)*1000)
                    //     .ease(d3.easeLinear)
                    //     .attr("x", tableLocations[index]["end"]);
                    // }
                    // else
                    {

                    
                    d3.select("#status").attr("x", tableLocations[index]["start"])
                        .transition().duration(durationDict[index]["duration"]*1000)
                        .ease(d3.easeLinear)
                        .attr("x", tableLocations[index]["end"]);
                    // document.getElementById(d3.select(this).attr("elementID")).play();
                    }
                }).append("svg:title").text("Play from start of this scene.");

        // svg.append("image")
        //     .attrs({
        //         "xlink:href": "images/playpause.png",
        //         "x": tableLocations[i+1]["start"] + (tableLocations[i+1]["end"] - tableLocations[i+1]["start"])/2 + 5,
        //         "y":(height - bottomPadding + 3*maxHeightOfHistogramBars + heightOfWaveform + 5),
        //         "width": "30px",
        //         "height": "30px",
        //         "elementID": elementIdArray[i],
        //         "index": (i+1)

        //     }).on("click", function(){
        //             var index = d3.select(this).attr("index");
        //             var myVideo = document.getElementById("video1");
        //             // playPause("video1");
        //             if (myVideo.paused) 
        //             {
        //                 var sbar = d3.select("#status");
        //                 var currentX = sbar.attr("x");
        //                 if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
        //                 {
        //                     var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
        //                     var dur = (currentX - tableLocations[index]["start"])/alpha;

        //                     d3.select("#status").attr("x", currentX)
        //                     .transition().duration((durationDict[index]["duration"] - dur)*1000)
        //                     .ease(d3.easeLinear)
        //                     .attr("x", tableLocations[index]["end"]);
        //                 }
        //                 else
        //                 {

                        
        //                 d3.select("#status").attr("x", tableLocations[index]["start"])
        //                     .transition().duration(durationDict[index]["duration"]*1000)
        //                     .ease(d3.easeLinear)
        //                     .attr("x", tableLocations[index]["end"]);
        //                 // document.getElementById(d3.select(this).attr("elementID")).play();
        //                 }
        //                 myVideo.play();
        //             }
        //             else
        //             {
        //                 myVideo.pause();
        //                 d3.select("#status").interrupt();

        //             }
        //             // document.getElementById(d3.select(this).attr("elementID")).pause();

        //         }).append("svg:title").text("Play/Pause");
        }

        var statusBar = svg.append("rect")
            .attrs({
                "id": "status",
                "x": textEnd,
                "y": topPadding,
                "width": "1px",
                "height": height + bottomPadding + maxHeightOfHistogramBars,
                "stroke":"none",
                "fill":"red",
                "stroke-width":"1px"
                // "style":"opacity:0;"
            })

        
        var vid = document.getElementById("video1");
        vid.onpause = function() {
            d3.select("#status").interrupt();
        };
        vid.onplay = function() {
            seeking1();
            var index = window.videoIndexBeingPlayed ;
            var sbar = d3.select("#status");
            var currentX = sbar.attr("x");
            // if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
            {
                var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
                var dur = (currentX - tableLocations[index]["start"])/alpha;

                d3.select("#status").attr("x", currentX)
                .transition().duration((durationDict[index]["duration"] - dur)*1000)
                .ease(d3.easeLinear)
                .attr("x", tableLocations[index]["end"]);
            }
        };
            
            // .attr("x2", tableLocations[1]["end"]);

    // svg.append("text")
    //     .attrs({
    //         "x": tableLocations[1]["start"] + (tableLocations[1]["end"] - tableLocations[1]["start"])/2,
    //         "y": (height - bottomPadding + 2*maxHeightOfHistogramBars + heightOfWaveform + 5),
    //         "text-anchor":"middle"
    //     }).text("Play")
    //     .on("click", function(){
    //         document.getElementById('p1Train').play();
    //     })
    // svg.append("image")
    //     .attrs({
    //         "xlink:href": "realStudy/p1/p1_test_final.PNG",
    //         "x": tableLocations[2]["start"],
    //         "y": (height - bottomPadding + 2*maxHeightOfHistogramBars),
    //         "width": (tableLocations[2]["end"] - tableLocations[2]["start"]),
    //         "height": heightOfWaveform
    //     });
    // svg.append("image")
    //     .attrs({
    //         "xlink:href": "images/play.png",
    //         "x": tableLocations[2]["start"] + (tableLocations[2]["end"] - tableLocations[2]["start"])/2 - 35,
    //         "y":(height - bottomPadding + 2*maxHeightOfHistogramBars + heightOfWaveform + 5),
    //         "width": "30px",
    //         "height": "30px"
    //     }).on("click", function(){
                
    //             document.getElementById('p1Test').play();
    //         });
    // svg.append("image")
    //     .attrs({
    //         "xlink:href": "images/pause2.png",
    //         "x": tableLocations[2]["start"] + (tableLocations[2]["end"] - tableLocations[2]["start"])/2 + 5,
    //         "y":(height - bottomPadding + 2*maxHeightOfHistogramBars + heightOfWaveform + 5),
    //         "width": "30px",
    //         "height": "30px"
    //     }).on("click", function(){
    //             document.getElementById('p1Test').pause();
    //         });
}

function seeking1()
{
    d3.select("#status").interrupt();

    var index = window.videoIndexBeingPlayed ;
    var myVideo = document.getElementById("video1");
    var currentTime = myVideo.currentTime;

    var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
    var posdash = alpha*currentTime + tableLocations[index]["start"];

    d3.select("#status").attr("x", posdash);
    // console.log(currentTime, currentX, posdash);

}

function seeking2()
{
    var index = window.videoIndexBeingPlayed ;
            var sbar = d3.select("#status");
            var currentX = sbar.attr("x");
            // if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
            {
                var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
                var dur = (currentX - tableLocations[index]["start"])/alpha;

                d3.select("#status").attr("x", currentX)
                .transition().duration((durationDict[index]["duration"] - dur)*1000)
                .ease(d3.easeLinear)
                .attr("x", tableLocations[index]["end"]);
            }

}


function countEventsInBin(startBinTimestep, endBinTimestep, binForDensity, eventDataArray, tempDictPerBin )
{
    for(var i=0; i<eventDataArray.length; i++)
    {
        if(eventDataArray[i]["start"]>= startBinTimestep && eventDataArray[i]["start"] <endBinTimestep )
            if (eventDataArray[i]["type"] != undefined)
                tempDictPerBin["events"][eventDataArray[i]["type"]] +=1;
        
    }
    return tempDictPerBin;
}
function playPause(id) { 
    var myVideo =  document.getElementById(id);
  if (myVideo.paused) 
    myVideo.play(); 
  else 
    myVideo.pause(); 
}
