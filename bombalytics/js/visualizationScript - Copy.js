function highlightEventsFunc()
{
    d3.selectAll(".hyperEdges").attr("opacity",0.1);
    d3.selectAll(".hyperNodes").attr("fill-opacity",0.1);
    d3.selectAll(".bomb").attr("opacity",0.1);
    // var thisEventType = d3.select(this).attr("type");
    // console.log( window._dataForVisualization.eventsDictionary[thisEventType]);
    
    for(var event in window.highlightEvents)
    {
        if(window.highlightEvents[event])
        {
            d3.selectAll("line."+ event).attr("opacity",0.6);
            d3.selectAll("g."+ event).attr("opacity",1.0);
            // d3.selectAll("rect."+ window._dataForVisualization.eventsDictionary[thisEventType]).attr("fill-opacity",1.0);
            if(event == "moved")
                d3.selectAll(".bomb.moved").attr("opacity",0.8);

            if(event == "death")
            {
                d3.selectAll(".killerBomb").attr("opacity",1.0);
                d3.selectAll(".killerBomb").selectAll(".moved").attr("opacity",0.8);
                d3.selectAll("line.killerKick").attr("opacity", 1);
                d3.selectAll("circle.killerKick").attr("fill-opacity",0.6);
            }

            if(event == "allBombs")
            {
                d3.selectAll(".bomb").attr("opacity",1);

            }
        

            d3.selectAll("."+event).attr("fill-opacity",0.6);
        }
    }
}

function agentImage(agentIndex)
{
    imageName = "";
    if(isTeamCompetition(window._dataForVisualization.gameName))
    {
        switch(agentIndex)
        {
            case 0: imageName="Agent0-number_ifteam.png"; break;
            case 1: imageName="Agent1-number_ifteam.png"; break;
            case 2: imageName="Agent2-number_ifteam.png"; break;
            case 3: imageName="Agent3-number_ifteam.png"; break;

        }
    }
    else
    {
        switch(agentIndex)
        {
            case 0: imageName="Agent0-number.png"; break;
            case 1: imageName="Agent1-number.png"; break;
            case 2: imageName="Agent2-number.png"; break;
            case 3: imageName="Agent3-number.png"; break;

        }
    }
    return imageName;
}

function makeAgentOrderCorrectInArray(array)
{
    var resultArray=[];
    var orderArray = [1,0,3,2];
    for(var i=0; i<orderArray.length; i++)
    {
        if(Array.isArray(array[orderArray[i]]))
        {
            resultArray.push( Array.from(array[orderArray[i]]) );
        }
        else if(typeof(array[orderArray[i]]) == "object")
        {
            if("agent_id" in array[orderArray[i]])
            {
                array[orderArray[i]]["agent_id"] = changeMappingOfAgentIndex(array[orderArray[i]]["agent_id"]);
            }
            resultArray.push( deepCopyDictionary(array[orderArray[i]]) );
        }
        else
        {
            resultArray.push(array[orderArray[i]]);
        }
    }
    return resultArray;
}

function changeMappingOfAgentIndex(agentIndex)
{
    var tempIndex = -1;
    switch(agentIndex)
    {
        case 0: tempIndex = 1; break;
        case 1: tempIndex = 0; break;
        case 2: tempIndex = 3; break;
        case 3: tempIndex = 2; break;
    }
    return tempIndex;
}

// agentNumber: 10 or 11 or 12 or 13
function changeMappingOfAgentBoardNumber(agentNumber)
{
    var tempIndex = -1;
    switch(agentNumber)
    {
        case 10: tempIndex = 11; break;
        case 11: tempIndex = 10; break;
        case 12: tempIndex = 13; break;
        case 13: tempIndex = 12; break;
    }
    return tempIndex;
}

function changeAgentIndices(array)
{
    var resultArray= [];
    for(var i=0; i<array.length; i++)
    {
        resultArray.push(changeMappingOfAgentIndex(array[i]));
    }
    return resultArray;
}

function isTileNonBlockingBombMovement(boardValue)
{
    var blockingBoardValues = [1,2,3,10,11,12,13];
    if(blockingBoardValues.indexOf(boardValue) >=0 )
        return false;
    else
        return true;

}
function isTeamCompetition(gameType)
{
    if(gameType.includes("Team") || gameType.includes("Radio"))
        return true;
    else
        return false;
}
function writeFile()
{
    console.log("window.agentsArray="+JSON.stringify(window.agentsArray)+";"+"window.gamesDataArray"+JSON.stringify(window.gamesDataArray)+";");
}
function debug()
{
    var bombsArray = window.gamesDataArray[0]["state"][129]["bombs"];
    // for(var i=0; i<bombsArray.length; i++)
    {
        if(bombsArray[3]["position"][0] !=7 || bombsArray[3]["position"][1] !=2)
        {
            console.log("Bombs position is wrong");
        }
        else
        {
            console.log("Bombs position is correct");
        }
    }
    
}
function debug2(message)
{
    console.log(message);
    var states = window.gamesDataArray[0]["state"];
    for(var i=0; i<states.length; i++)
    {
        if(states[i]["step_count"] == "129")
        {
            if(states[i]["bombs"][3]["position"][0] !=7 || states[i]["bombs"][3]["position"][1] !=2)
            {
                console.log("Bombs position is wrong");
            }
            else
            {
                console.log("Bombs position is correct");
            }
        }
    }
}

function sortSteps(stateArray)
{
    stateArray.sort(function (a,b)
    {
        var a_step = parseInt(a.step_count);
        var b_step = parseInt(b.step_count);
        return a_step - b_step;
    })
    return stateArray;
}

function getNumStepsBetweenTwoPositions(p1, p2){
   return  Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]);
}
function agentNameSimplify(agentName)
{
    var index = agentName.lastIndexOf("/");
    var simpleName = agentName.substring(index+1);

    index = simpleName.lastIndexOf("test::agents.");
    var simpleName2 = simpleName;
    if(index > -1)
        simpleName2 =  simpleName.substring(index+13);
    // return agentName;
    return simpleName2;
}
function hash(string) { 
                  
    var hash = 0; 
      
    if (string.length == 0) return hash; 
      
    for (i = 0; i < string.length; i++) { 
        char = string.charCodeAt(i); 
        hash = ((hash << 5) - hash) + char; 
        hash = hash & hash; 
    } 
      
    return hash; 
} 
function deepCopyDictionary(object)
{
    return JSON.parse(JSON.stringify(object));
}
// function bombExistedInPreviousStep(bombObject, previousBombsArray)
// {
//     var returnValue = false;
//     var bombObjectInPreviousStep = {};

//     if(bombObject["moving_direction"] == null)
//     {
//         for(var x=0; x<previousBombsArray.length; x++)
//         {
//             if(previousBombsArray[x]["position"][0] == bombObject["position"][0] && previousBombsArray[x]["position"][1] == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
//             {
//                 return [true, deepCopyDictionary(previousBombsArray[x])];
//             }
//         }
//         return [false, {}];
//     }
//     else
//     {
//         for(var x=0; x<previousBombsArray.length; x++)
//         {
//             switch(bombObject["moving_direction"])
//             {
//                 case 3: if( (previousBombsArray[x]["position"][0] - 1) == bombObject["position"][0] && previousBombsArray[x]["position"][1] == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
//                         {
//                             return [true, deepCopyDictionary(previousBombsArray[x])];
//                         }
//                         break;
//                 case 4: if( (previousBombsArray[x]["position"][0] + 1) == bombObject["position"][0] && previousBombsArray[x]["position"][1] == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
//                         {
//                             return [true, deepCopyDictionary(previousBombsArray[x])];
//                         }
//                         break;
//                 case 1: if( previousBombsArray[x]["position"][0] == bombObject["position"][0] && (previousBombsArray[x]["position"][1] - 1) == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
//                         {
//                             return [true, deepCopyDictionary(previousBombsArray[x])];
//                         }
//                         break;
//                 case 2: if( previousBombsArray[x]["position"][0] == bombObject["position"][0] && (previousBombsArray[x]["position"][1] + 1) == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
//                         {
//                             return [true, deepCopyDictionary(previousBombsArray[x])];
//                         }
//                         break;
                
//             }
//         }
//         return [false, {}];
//     }
// }

function bombExistedInPreviousStep(bombObject, previousBombsArray)
{
    var returnValue = false;
    var bombObjectInPreviousStep = {};

    if(bombObject["moving_direction"] == null)
    {
        for(var x=0; x<previousBombsArray.length; x++)
        {
            if(previousBombsArray[x]["position"][0] == bombObject["position"][0] && previousBombsArray[x]["position"][1] == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
            {
                return [true, deepCopyDictionary(previousBombsArray[x])];
            }
        }
        return [false, {}];
    }
    else
    {
        for(var x=0; x<previousBombsArray.length; x++)
        {
            switch(bombObject["moving_direction"])
            {
                case 1: if( (previousBombsArray[x]["position"][0] - 1) == bombObject["position"][0] && previousBombsArray[x]["position"][1] == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
                        {
                            return [true, deepCopyDictionary(previousBombsArray[x])];
                        }
                        break;
                case 2: if( (previousBombsArray[x]["position"][0] + 1) == bombObject["position"][0] && previousBombsArray[x]["position"][1] == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
                        {
                            return [true, deepCopyDictionary(previousBombsArray[x])];
                        }
                        break;
                case 3: if( previousBombsArray[x]["position"][0] == bombObject["position"][0] && (previousBombsArray[x]["position"][1] - 1) == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
                        {
                            return [true, deepCopyDictionary(previousBombsArray[x])];
                        }
                        break;
                case 4: if( previousBombsArray[x]["position"][0] == bombObject["position"][0] && (previousBombsArray[x]["position"][1] + 1) == bombObject["position"][1] && previousBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && previousBombsArray[x]["life"] == (bombObject["life"] +1))
                        {
                            return [true, deepCopyDictionary(previousBombsArray[x])];
                        }
                        break;
                
            }
        }
        return [false, {}];
    }
}
// function bombExistsInNextStep(bombObject, nextBombsArray)
// {
//     var returnValue = false;
//     var bombObjectInPreviousStep = {};

//     if(bombObject["moving_direction"] == null)
//     {
//         for(var x=0; x<nextBombsArray.length; x++)
//         {
//             if(nextBombsArray[x]["position"][0] == bombObject["position"][0] && nextBombsArray[x]["position"][1] == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
//             {
//                 return [true, deepCopyDictionary(nextBombsArray[x])];
//             }
//         }
//         return [false, {}];
//     }
//     else
//     {
//         for(var x=0; x<nextBombsArray.length; x++)
//         {
//             switch(bombObject["moving_direction"])
//             {
//                 case 3: if( (nextBombsArray[x]["position"][0] + 1) == bombObject["position"][0] && nextBombsArray[x]["position"][1] == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
//                         {
//                             return [true, deepCopyDictionary(nextBombsArray[x])];
//                         }
//                         break;
//                 case 4: if( (nextBombsArray[x]["position"][0] - 1) == bombObject["position"][0] && nextBombsArray[x]["position"][1] == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
//                         {
//                             return [true, deepCopyDictionary(nextBombsArray[x])];
//                         }
//                         break;
//                 case 1: if( nextBombsArray[x]["position"][0] == bombObject["position"][0] && (nextBombsArray[x]["position"][1] + 1) == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
//                         {
//                             return [true, deepCopyDictionary(nextBombsArray[x])];
//                         }
//                         break;
//                 case 2: if( nextBombsArray[x]["position"][0] == bombObject["position"][0] && (nextBombsArray[x]["position"][1] - 1) == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
//                         {
//                             return [true, deepCopyDictionary(nextBombsArray[x])];
//                         }
//                         break;
                
//             }
//         }
//         return [false, {}];
//     }
// }

function bombExistsInNextStep(bombObject, nextBombsArray)
{
    var returnValue = false;
    var bombObjectInPreviousStep = {};
    if(nextBombsArray == undefined)
        return [false, {}];

    if(bombObject["moving_direction"] == null)
    {
        for(var x=0; x<nextBombsArray.length; x++)
        {
            if(nextBombsArray[x]["position"][0] == bombObject["position"][0] && nextBombsArray[x]["position"][1] == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] +1))
            {
                return [true, deepCopyDictionary(nextBombsArray[x])];
            }
        }
        return [false, {}];
    }
    else
    {
        for(var x=0; x<nextBombsArray.length; x++)
        {
            switch(bombObject["moving_direction"])
            {
                case 1: if( (nextBombsArray[x]["position"][0] + 1) == bombObject["position"][0] && nextBombsArray[x]["position"][1] == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
                        {
                            return [true, deepCopyDictionary(nextBombsArray[x])];
                        }
                        break;
                case 2: if( (nextBombsArray[x]["position"][0] - 1) == bombObject["position"][0] && nextBombsArray[x]["position"][1] == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
                        {
                            return [true, deepCopyDictionary(nextBombsArray[x])];
                        }
                        break;
                case 3: if( nextBombsArray[x]["position"][0] == bombObject["position"][0] && (nextBombsArray[x]["position"][1] + 1) == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
                        {
                            return [true, deepCopyDictionary(nextBombsArray[x])];
                        }
                        break;
                case 4: if( nextBombsArray[x]["position"][0] == bombObject["position"][0] && (nextBombsArray[x]["position"][1] - 1) == bombObject["position"][1] && nextBombsArray[x]["bomber_id"] == bombObject["bomber_id"] && nextBombsArray[x]["life"] == (bombObject["life"] -1))
                        {
                            return [true, deepCopyDictionary(nextBombsArray[x])];
                        }
                        break;
                
            }
        }
        return [false, {}];
    }
}

function getStateSequencesOfAgents(stateArray)
{
    var stateSequencesArray = [];
    
    var data = stateArray;
    var numberOfAgents = 4;
    var bombsData = [];

    // Assign bombIds 
    for(var i=1; i<data.length; i++)
    {
        for(var j=0; j<data[i]["bombs"].length; j++)
        {
            var previousStep = data[i-1];
            var currentStep = data[i];
            var previousBombs = previousStep["bombs"];
            var currentBombs = currentStep["bombs"];
            for(var k=0; k<currentBombs.length; k++)
            {
                var tempBombCheck = bombExistedInPreviousStep(currentBombs[k], previousBombs);

                if(tempBombCheck[0] == false)
                {
                    data[i]["bombs"][k]["bombId"] = window.bombCounter;
                    window.bombCounter++;
                }
                else
                {
                    if(tempBombCheck[1]["bombId"] == undefined)     
                    {
                        console.log("did not find bomb id", i);
                    }
                    data[i]["bombs"][k]["bombId"] = tempBombCheck[1]["bombId"];
                }
            }
        }

    }

    //Assign bombIds to the flames

    for(var i=0; i<data.length-1; i++)
    {
        for(var j=0; j<data[i]["bombs"].length; j++)
        {
            var nextStep = data[i+1];
            var currentStep = data[i];
            var size = parseInt(currentStep["board_size"]);
            var nextFlames = nextStep["flames"];
            var currentBombs = currentStep["bombs"];
            for(var k=0; k<currentBombs.length; k++)
            {
                // Check if bomb will explode in next step
                // The condition also does not check the cases when the bomb has more than one life, but exploded due to bomb chain
                // The condition does not check the case where bomb gets kicked in its last step just before exploding. The identification of detecting kick in last step is yet to be written.
                // if(i==119 && k==2)
                //     console.log(i);
                var tempcheck = bombExistsInNextStep(currentBombs[k], nextStep["bombs"]);
                if(currentBombs[k]["life"] == 1 || tempcheck[0] == false)
                {
                    var blast_strength = currentBombs[k]["blast_strength"];
                    var blast_position = [];
                    if(currentBombs[k]["moving_direction"] == null)
                    {
                        blast_position = currentBombs[k]["position"];
                        var bombKickedInlaststep = false;

                        for(var u=0; u<currentStep.agents.length; u++)
                        {
                            if(currentStep["agents"][u]["is_alive"] != nextStep["agents"][u]["is_alive"])
                            {
                                for(var q=0; q<currentStep["bombs"].length; q++)
                                {
                                    var bombObject = currentStep["bombs"][q];
                                    var tempBombCheck2 = bombExistsInNextStep(bombObject, nextBombs);
                                    if(tempBombCheck2[0] == false)
                                    {
                                        if(bombObject["position"][0] == nextStep["agents"][u]["position"][0] && bombObject["position"][1] == nextStep["agents"][u]["position"][1] )
                                        {
                                            bombKickedInlaststep = true;
                                            var indendedActionOfAgent = nextStep["intended_actions"][u];
                                            if(Array.isArray(indendedActionOfAgent))
                                            {
                                                indendedActionOfAgent = indendedActionOfAgent[0];
                                            }

                                            switch(indendedActionOfAgent)
                                            {
                                                case 1: var tempPos = [bombObject["position"][0] - 1, bombObject["position"][1] ];
                                                        if(tempPos[0] >=0)
                                                        {
                                                            var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                                            if(isTileNonBlockingBombMovement(tempBoardValue))
                                                                blast_position = tempPos; 
                                                        }
                                                            break;
                                                case 2: var tempPos =  [bombObject["position"][0] + 1, bombObject["position"][1]] ;
                                                        if(tempPos[0] <=10)
                                                        {
                                                        var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                                        if(isTileNonBlockingBombMovement(tempBoardValue))
                                                            blast_position = tempPos; 
                                                        }
                                                        break;
                                                
                                                case 3: var tempPos = [bombObject["position"][0] , bombObject["position"][1] - 1 ] ;
                                                        if(tempPos[1] >=0)
                                                        {
                                                        var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                                        if(isTileNonBlockingBombMovement(tempBoardValue))
                                                            blast_position = tempPos; 
                                                        }
                                                        break;
                                                
                                                case 4: var tempPos = [bombObject["position"][0] , bombObject["position"][1] + 1] ;
                                                        if(tempPos[1] <=10)
                                                        {
                                                        var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                                        if(isTileNonBlockingBombMovement(tempBoardValue))
                                                            blast_position = tempPos; 
                                                        }
                                                        break;
                                            }
                                            if(blast_position[0] > ( size - 1) )
                                                blast_position[0] = size -1;
                                            else if(blast_position[1] > (size-1))
                                                blast_position[1] = size -1;
                                            else if(blast_position[0] < 0)
                                                blast_position[0] = 0;
                                            else if (blast_position[1] < 0)
                                                blast_position = 0;
                                            
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else
                    {
                        blast_position = currentBombs[k]["position"];
                        switch(currentBombs[k]["moving_direction"])
                        {
                            case 1: var tempPos = [currentBombs[k]["position"][0] - 1, currentBombs[k]["position"][1] ];
                                    if(tempPos[0] >=0)
                                    {
                                        var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                        if(isTileNonBlockingBombMovement(tempBoardValue))
                                            blast_position = tempPos; 
                                    }
                                        break;

                            case 2: var tempPos =  [currentBombs[k]["position"][0] + 1, currentBombs[k]["position"][1]] ;
                                    if(tempPos[0] <=10)
                                    {
                                    var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                    if(isTileNonBlockingBombMovement(tempBoardValue))
                                        blast_position = tempPos; 
                                    }
                                    break;
                            
                            case 3: var tempPos = [currentBombs[k]["position"][0] , currentBombs[k]["position"][1] - 1 ] ;
                                    if(tempPos[1] >=0)
                                    {
                                    var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                    if(isTileNonBlockingBombMovement(tempBoardValue))
                                        blast_position = tempPos; 
                                    }
                                    break;
                           
                            case 4: var tempPos = [currentBombs[k]["position"][0] , currentBombs[k]["position"][1] + 1] ;
                                    if(tempPos[1] <=10)
                                    {
                                    var tempBoardValue = data[i]["board"][tempPos[0]][tempPos[1]];
                                    if(isTileNonBlockingBombMovement(tempBoardValue))
                                        blast_position = tempPos; 
                                    }
                                    break;
                        }

                        
                        if(blast_position[0] > ( size - 1) )
                            blast_position[0] = size -1;
                        else if(blast_position[1] > (size-1))
                            blast_position[1] = size -1;
                        else if(blast_position[0] < 0)
                            blast_position[0] = 0;
                        else if (blast_position[1] < 0)
                            blast_position = 0;

                    }
                    var directionArray =  [1,2,3,4];
                    for(var l=0; l<directionArray.length; l++)
                    {
                       
                        var bombLimitedExtentFlag  = false;
                        for (var m=0; m <= (blast_strength+1); m++)
                        {
                            // console.log(i,j,k,l,m);
                            var positionCheck = returnPositionOfTile(currentStep, blast_position, blast_strength, directionArray[l], m, size );
                            var tilePos = positionCheck[1];
                            if(positionCheck[0] == -1)
                            {
                                bombLimitedExtentFlag = true;
                            }
                            if(positionCheck[0] != -1 && bombLimitedExtentFlag == false)
                            {
                                for(var x=0; x<=window.flameDuration; x++)
                                {
                                    if((i+1+x) <data.length)
                                    {
                                        var tempNextFlames = data[i + 1 + x]["flames"];
                                
                                        for(var n=0; n<tempNextFlames.length; n++)
                                        {
                                            // if(tempNextFlames[n]["position"][0] == tilePos[0] && tempNextFlames[n]["position"][1] == tilePos[1] && tempNextFlames[n]["life"] == (window.flameDuration - x))
                                            if(tempNextFlames[n]["position"][0] == tilePos[0] && tempNextFlames[n]["position"][1] == tilePos[1] )
                                            {
                                                if( ("bombId" in  data[i+1+x]["flames"][n]) &&  data[i+1+x]["flames"][n]["bombId"] != currentBombs[k]["bombId"])
                                                {
                                                    var copyFlame = deepCopyDictionary(data[i+1+x]["flames"][n]);
                                                    copyFlame["bombId"] = currentBombs[k]["bombId"];
                                                    // data[i+1+x]["flames"].push(copyFlame);
                                                    var stepNum = i+1+x;
                                                    if(!(stepNum in window.extraFlamesDictionary))
                                                    {
                                                        window.extraFlamesDictionary[stepNum] = {};
                                                    }
                                                    if(!(copyFlame["bombId"] in window.extraFlamesDictionary[stepNum]))
                                                    {
                                                        window.extraFlamesDictionary[stepNum][copyFlame["bombId"]] = copyFlame;
                                                    }
                                                    
                                                }
                                                else if(!("bombId" in  data[i+1+x]["flames"][n]))
                                                    data[i+1+x]["flames"][n]["bombId"] = currentBombs[k]["bombId"];
                                            }
                                        }
                                    }
                                }
                            }
                            if(positionCheck[0] == 0)
                            {
                                bombLimitedExtentFlag = true;
                            }
                        }
                    }
                   
                }
            }
        }
    }

    function returnPositionOfTile(currentStep, blast_position, blast_strength, direction, distance, size )
    {
        var returnTilePosition = -1;
        var returnValue = [-1, []];
        var tempPos = -1;
        switch(direction)
        {
            case 1: tempPos = [blast_position[0] - distance, blast_position[1] ] ; break;
            case 2: tempPos = [blast_position[0] + distance, blast_position[1] ] ; break;
            case 3: tempPos = [blast_position[0], blast_position[1]  - distance] ; break;
            case 4: tempPos = [blast_position[0] , blast_position[1] + distance] ; break;
        }
        if(tempPos[0] > ( size - 1) )
            return [-1, []];
        else if(tempPos[1] > (size-1))
            return [-1, []];
        else if(tempPos[0] < 0)
            return [-1, []];
        else if (tempPos[1] < 0)
            return [-1, []];
        else
        {
            var feasibleBoardValues = [0, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13];
            var bombStoppingBoardValues = [2];
            if(currentStep["board"] == undefined || tempPos[0] == undefined || tempPos[1] == undefined)
            {
                // console.log("Something went wrong while finding tile position of flames.");
                return [-1, []];
            }
            var boardValue = currentStep["board"][tempPos[0]][tempPos[1]];
            if ( feasibleBoardValues.indexOf(boardValue) >=0 )
            {
                returnValue[0] = 1;
                returnValue[1] = Array.from(tempPos);
            }
            else if(bombStoppingBoardValues.indexOf(boardValue) >=0)
            {
                returnValue[0] = 0;
                returnValue[1] = Array.from(tempPos);
            }
            else
            {
                returnValue[0] = -1;
                returnValue[1] = [];
            }

            return returnValue;
        }

        
    }


    // // Assign bombIds to the flames
    // for(var i=0; i<data.length-1; i++)
    // {
    //     for(var j=0; j<data[i]["bombs"].length; j++)
    //     {
    //         var nextStep = data[i+1];
    //         var currentStep = data[i];
    //         var nextFlames = nextStep["flames"];
    //         var currentFlames = currentStep["flames"];
    //         var currentBombs = currentStep["bombs"];
    //         // for(var k=0; k<currentBombs.length; k++)
    //         // {
    //         //     if(currentBombs[k]["life"] == 1)
    //         // }
    //         for(var k=0; k<nextFlames.length; k++)
    //         {
    //             // If the flame existed before
    //             if(nextFlames[k]["life"] < window.flameDuration)
    //             {
    //                 var bombId = findTheBombIdOfFlameWithGivenPositionAndLife(currentFlames, nextFlames[k]);
    //             }
    //             else if (nextFlames[k]["life"] == window.flameDuration) //The bomb blast event started
    //             {
    //                 // Find the relevant Bomb and assign its id to the flame. Handle the bomb chain use case

    //                 // Check every bomb in current step and see 
    //             }
    //         }
    //     }
    // }

    function findTheBombIdOfFlameWithGivenPositionAndLife(flameArray, flame)
    {
        var bombId = -1;
        for(var i=0; i<flameArray.length; i++)
        {
            if(checkIfSamePosition(flame["position"], flameArray[i]["position"]) &&  flameArray[i]["life"] == (flame["life"] + 1) )
                bombId = flameArray[i]["bombId"];

        }
        if(bombId == -1)
            console.log("BombId was not found");

        return bombId;
    }

    function checkIfSamePosition(pos1, pos2)
    {
        if(pos1[0] == pos2[0] && pos1[1] == pos2[1])
            return true;
        else
            return false;
    }

    for(var i=0; i<data.length; i++)
    {
        var tempState={"moved": false, "laidBomb": false, "kicked": false, "pickedPower": false, "pickedPowerType": {"extra": false, "range": false, "kick": false}, "death": false , "deathByBombs":[], "radio":0};
        var tempStateArray = [];
        for(var j=0; j<numberOfAgents; j++)
        {
            tempStateArray.push(JSON.parse(JSON.stringify(tempState)));
        }
        var currentStep = data[i];

        // Check Radio
        if("_radio_from_agent" in data[i])
        {
            var radioArray = data[i]["_radio_from_agent"];
            for(var j=0; j<radioArray.length; j++)
            {
                var numOfIntsInRadio = 0;
                if(radioArray[j][1] >=1 && radioArray[j][1] <=8 ) numOfIntsInRadio++;
                if(radioArray[j][2] >=1 && radioArray[j][2] <=8 ) numOfIntsInRadio++;
                
                switch(radioArray[j][0])
                {
                    case 10: tempStateArray[0]["radio"] = numOfIntsInRadio; break;
                    case 11: tempStateArray[1]["radio"] = numOfIntsInRadio; break;
                    case 12: tempStateArray[2]["radio"] = numOfIntsInRadio; break;
                    case 13: tempStateArray[3]["radio"] = numOfIntsInRadio; break;
                }
            }
        }
        

        if(i<data.length-1)
        {
            var nextStep = data[i+1];
            var tempMovementDictionary = {};
            for(var j=0; j<currentStep.agents.length; j++)
            {
                var currentAgentIndex = currentStep.agents[j].agent_id;
                tempMovementDictionary[currentAgentIndex] = {"currentPos":currentStep.agents[j].position,"currentAlive": currentStep.agents[j]["is_alive"], "nextPos":[], "nextAlive": false} ;
                
            }
            for(var j=0; j<nextStep.agents.length; j++)
            {
                var currentAgentIndex = nextStep.agents[j].agent_id;
                tempMovementDictionary[currentAgentIndex]["nextPos"]=nextStep.agents[j].position ;
                tempMovementDictionary[currentAgentIndex]["nextAlive"]=nextStep.agents[j]["is_alive"] ;
                
            }

            for(var agentIndex in tempMovementDictionary)
            {
                var isAliveinCurrentAndNextStep = false;
                agentIndex = parseInt(agentIndex);
                if(tempMovementDictionary[agentIndex]["currentAlive"] == true && tempMovementDictionary[agentIndex]["currentAlive"] == tempMovementDictionary[agentIndex]["nextAlive"])
                    isAliveinCurrentAndNextStep = true;

                // Check Movement 
                if(isAliveinCurrentAndNextStep == true && tempMovementDictionary[agentIndex]["currentPos"][0] == tempMovementDictionary[agentIndex]["nextPos"][0] && tempMovementDictionary[agentIndex]["currentPos"][1] == tempMovementDictionary[agentIndex]["nextPos"][1])
                {
                    tempStateArray[agentIndex]["moved"] = false;
                }
                else if(isAliveinCurrentAndNextStep == true)
                {
                    tempStateArray[agentIndex]["moved"] = true;
                }
                else
                {
                    tempStateArray[agentIndex]["moved"] = false;
                }
            }
                
                var currentBombs = currentStep["bombs"];
                var nextBombs = nextStep["bombs"];
                for(var k=0; k<nextBombs.length; k++)
                {
                    var tempBombCheck = bombExistedInPreviousStep(nextBombs[k], currentBombs);
                    // if(i ==410)
                    // {
                    //     console.log(nextBombs[k], currentBombs, tempBombCheck);
                    // }
                    // Check Laid Bomb
                    // if(i==462)
                    // {
                    //     console.log(tempBombCheck);
                    // }
                    // if(i==463)
                    // {
                    //     console.log(tempBombCheck);
                    // }
                    if(tempBombCheck[0] == false)
                    {
                        tempStateArray[nextBombs[k]["bomber_id"]]["laidBomb"] = true;
                        // tempStateArray[nextBombs[k]["bomber_id"]]["bombId"] = window.bombCounter;
                        bombsData.push({"bombId": nextBombs[k]["bombId"], "bomber_id": nextBombs[k]["bomber_id"], "stepNumber": (i), "position": Array.from(nextBombs[k]["position"])  })
                        // data[i+1]["bombs"][k]["bombId"] = window.bombCounter;
                        // window.bombCounter++;
                    }
                   
                    // Check Kicked Bomb
                    else
                    {
                        var bombMoveDistance = getNumStepsBetweenTwoPositions(tempBombCheck[1]["position"], nextBombs[k]["position"]);
                        var bombKicked =true;
                        var bomber_id = tempBombCheck[1]["bomber_id"];
                        var bombId = tempBombCheck[1]["bombId"];

                        

                        if(tempBombCheck[1]["moving_direction"] == null && nextBombs[k]["moving_direction"] != null )
                        {
                            bombKicked =true;
                        }
                        else if(tempBombCheck[1]["moving_direction"] == nextBombs[k]["moving_direction"])
                        {
                            bombKicked= false;
                        }

                        

                        if(bombMoveDistance >1 )
                        {
                            console.log("Bomb moved more than 1 step");
                        }

                        if(bombMoveDistance >=1 && bombKicked == true)
                        {
                            var kickingAgentId = -1;
                            var boardValue = nextStep["board"][tempBombCheck[1]["position"][0]][tempBombCheck[1]["position"][1]];
                            switch(boardValue)
                            {
                                case 10: kickingAgentId = 0;
                                        break;
                                case 11: kickingAgentId = 1;
                                        break;
                                case 12: kickingAgentId = 2;
                                        break;
                                case 13: kickingAgentId = 3;
                                        break;
                                default: 
                                        // console.log("Bomb was moving from previous kick.");
                                        bombKicked = false;
                                        break;
                            }
                            if(bombKicked)
                            {
                                if(bombId != undefined)
                                {
                                    tempStateArray[kickingAgentId]["kicked"] = true;
                                    tempStateArray[kickingAgentId]["bomber_id"] = bomber_id;
                                    tempStateArray[kickingAgentId]["bombId"] = bombId;
                                }

                                else
                                {
                                    console.log("bombId not defined",i, kickingAgentId, bomber_id, tempBombCheck);
                                }
                                
                            }
                        }
                    }
                }

                // check position of any agent in next step == current position of the bomb
                // also, for confirmation, agent is alive in current but died in next step
                for(var u=0; u<currentStep.agents.length; u++)
                {
                    if(currentStep["agents"][u]["is_alive"] != nextStep["agents"][u]["is_alive"])
                    {
                        for(var q=0; q<currentStep["bombs"].length; q++)
                        {
                            var bombObject = currentStep["bombs"][q];
                            var tempBombCheck2 = bombExistsInNextStep(bombObject, nextBombs);
                            if(tempBombCheck2[0] == false)
                            {
                                if(bombObject["position"][0] == nextStep["agents"][u]["position"][0] && bombObject["position"][1] == nextStep["agents"][u]["position"][1] )
                                {
                                    var kickingAgentId = u;
                                    tempStateArray[kickingAgentId]["kicked"] = true;
                                    tempStateArray[kickingAgentId]["bomber_id"] =  bombObject["bomber_id"];;
                                    tempStateArray[kickingAgentId]["bombId"] = bombObject["bombId"];
                                }
                            }
                        }
                    }
                }

            
        }

        if(i>0)
        {
            var previousStep = data[i-1];

            // Check for power pickup
            var boardSize = parseInt(currentStep["board_size"]);
            for(var x = 0; x<boardSize; x++)
            {
                for(var y=0; y<boardSize; y++)
                {
                    var previousStepBoardValue = previousStep["board"][x][y];
                    var currentStepBoardValue = currentStep["board"][x][y];
                    var agentIdWhoPickedUpPower = -1;
                    var pickedPower = -1;
                    var pickedPowerFlag = false;

                    if(previousStepBoardValue != currentStepBoardValue && currentStepBoardValue in decodeBoardValueDictionary)
                    {
                        switch(previousStepBoardValue)
                        {
                            case 6: agentIdWhoPickedUpPower = decodeBoardValueDictionary[currentStepBoardValue];
                                    pickedPower = previousStepBoardValue;
                                    pickedPowerFlag = true;
                                    break;
                            case 7: agentIdWhoPickedUpPower = decodeBoardValueDictionary[currentStepBoardValue];
                                    pickedPower = previousStepBoardValue;
                                    pickedPowerFlag = true;
                                    break;
                            case 8: agentIdWhoPickedUpPower = decodeBoardValueDictionary[currentStepBoardValue];
                                    pickedPower = previousStepBoardValue;
                                    pickedPowerFlag = true;
                                    break;

                        }
                    }
                    if(pickedPowerFlag)
                    {
                       

                        tempStateArray[agentIdWhoPickedUpPower]["pickedPower"] = true;
                        switch(pickedPower)
                        {
                            case 6: 
                                    tempStateArray[agentIdWhoPickedUpPower]["pickedPowerType"]["extra"] = true;
                                    break;
                            case 7: 
                                    tempStateArray[agentIdWhoPickedUpPower]["pickedPowerType"]["range"] = true;
                                    break;
                            case 8: 
                                    tempStateArray[agentIdWhoPickedUpPower]["pickedPowerType"]["kick"] = true;
                                    break;
                        }

                    }

                }
            }

            // Check Death
            for( var x=0; x<currentStep["agents"].length; x++)
            {
                for( var y=0; y<previousStep["agents"].length; y++)
                {
                    var currentAgentId = currentStep["agents"][x]["agent_id"];
                    var previousAgentId = previousStep["agents"][y]["agent_id"];
                    if(currentAgentId == previousAgentId)
                    {
                        if(currentStep["agents"][x]["is_alive"] == false && previousStep["agents"][y]["is_alive"] == true)
                        {    
                            tempStateArray[currentAgentId]["death"] = true;

                            //Detect which bombs killed the agent

                            // step1: detect which flames killed the agent
                            var killingFlames = [];
                            var killingBomdsIdArray=[];
                            // if(i==419)
                            // {
                            //     console.log("jj");
                            // }
                            for(var m =0; m< currentStep["flames"].length; m++)
                            {
                                if(currentStep["flames"][m]["position"][0] == currentStep["agents"][x]["position"][0] && currentStep["flames"][m]["position"][1] == currentStep["agents"][x]["position"][1])
                                {
                                    killingFlames.push(currentStep["flames"][m]);
                                    killingBomdsIdArray.push(currentStep["flames"][m]["bombId"]);
                                    window.allBombIdsResponsibleForDeath.push(currentStep["flames"][m]["bombId"]);
                                }

                                
                            }
                            // check additional flames responsible for death
                            var additionalFlames = window.extraFlamesDictionary[i];
                            for(var bid in additionalFlames)
                            {
                                if(additionalFlames[bid]["position"][0] == currentStep["agents"][x]["position"][0] && additionalFlames[bid]["position"][1] == currentStep["agents"][x]["position"][1]  )
                                {
                                    killingFlames.push(additionalFlames[bid]);
                                    killingBomdsIdArray.push(additionalFlames[bid]["bombId"]);
                                    window.allBombIdsResponsibleForDeath.push(additionalFlames[bid]["bombId"]); 
                                }
                            }

                            tempStateArray[currentAgentId]["deathByBombs"] = killingBomdsIdArray;
                            if(killingBomdsIdArray.length ==0)
                            {
                                console.log(currentStep, previousStep);
                            }

                            
                        }
    
                    }
                }
            }
        }
        stateSequencesArray.push(tempStateArray);
    }
    window._dataForVisualization["bombsData"] = bombsData;
    // console.log(bombsData);
    return stateSequencesArray;
}

function getEdges(eventSequences, entityRowsArray, entitiesDictionary)
{
    var edges = [];
    // var numberOfAgents = 4;
    for(var i=0; i<eventSequences.length; i++)
    {
        var datum = eventSequences[i];
        for(var j=0; j<datum.length; j++)
        {
            
            
            if(datum[j]["laidBomb"])
            {
                edges.push({"source": window.agentIndex_RowidDictionary[j], "target": targetrowId, "stepNumber": i, "type":"laidBomb", "bombId":datum[j]["bombId"]});
            }
            // Add kicked edges from "bombsdata"
            if(datum[j]["kicked"])
            {
                var bombOwnerId = datum[j]["bomber_id"];
                var targetrowId = "";
                switch(window.agentIndex_RowidDictionary[bombOwnerId])
                {
                    case "e1": targetrowId = "e10"; break;
                    case "e2": targetrowId = "e11"; break;
                    case "e3": targetrowId = "e12"; break;
                    case "e4": targetrowId = "e13"; break;
                }
                
                edges.push({"source": window.agentIndex_RowidDictionary[j], "target": targetrowId, "stepNumber": i, "type":"kicked", "bombId":datum[j]["bombId"]});
            }
            if(datum[j]["pickedPower"])
            {
                if(datum[j]["pickedPowerType"]["extra"])
                    edges.push({"source": window.agentIndex_RowidDictionary[j], "target": "e7", "stepNumber": i, "type":"pickedPower"});

                if(datum[j]["pickedPowerType"]["range"])
                    edges.push({"source": window.agentIndex_RowidDictionary[j], "target": "e8", "stepNumber": i, "type":"pickedPower"});

                if(datum[j]["pickedPowerType"]["kick"])
                    edges.push({"source": window.agentIndex_RowidDictionary[j], "target": "e9", "stepNumber": i, "type":"pickedPower"});
            }

            if(datum[j]["death"])
            {
                var bombOwnerId = datum[j]["bomber_id"];
                var targetrowId = "";
                switch(window.agentIndex_RowidDictionary[bombOwnerId])
                {
                    case "e1": targetrowId = "e10"; break;
                    case "e2": targetrowId = "e11"; break;
                    case "e3": targetrowId = "e12"; break;
                    case "e4": targetrowId = "e13"; break;
                }
                for(var z=0; z< datum[j]["deathByBombs"].length; z++)
                {
                    if(datum[j]["deathByBombs"][z] !=undefined)
                        edges.push({"source": window.agentIndex_RowidDictionary[j], "target": datum[j]["deathByBombs"][z] , "stepNumber": i, "type":"death"});
                    else
                        console.log("killing bomb id not defined");
                }
            }
        }
    }
    // var bombsData = window._dataForVisualization["bombsData"];
    // for(var i=0; i< bombsData.length; i++)
    // {
    //     for(var j=0; j< bombsData[i]["timeline"].length; j++)
    //     {
    //         if(bombsData[i]["timeline"][j]["kicked"])
    //         {
    //             var srcAgentindex = bombsData[i]["timeline"][j]["kickingAgentId"];
    //             var bombowneragentindex = bombsData[i]["bomber_id"]
    //             edges.push({"source": window.agentIndex_RowidDictionary[srcAgentindex], "target": window.agentIndex_RowidDictionary[bombowneragentindex], "stepNumber": bombsData[i]["timeline"][j]["step"], "type":"kicked"});
    //         }
    //     }
    // }
    return edges;
}

function calculateStatesOfIndividualBombs(stateSequence)
{

  
    
    // var stateSequence =  window.pommermanData["blob"]["state"];

      // Assign bombids in data
    for(var i=0; i<stateSequence.length; i++)
    {
        stateSequence[i]["bombsDictionary"] = {};

        for(var j=0; j<stateSequence[i]["bombs"].length; j++)
        {
            var oneBomb = stateSequence[i]["bombs"][j];
            if(!("bombId" in oneBomb))
            {
                var previousBombs = stateSequence[i-1]["bombs"];
                var tempBombCheck = bombExistedInPreviousStep(oneBomb, previousBombs);
                if(tempBombCheck[0])
                {
                    oneBomb["bombId"] = tempBombCheck[1]["bombId"];
                }
            }
            stateSequence[i]["bombsDictionary"][oneBomb["bombId"]] = oneBomb;

        }
    }


    // console.log(window.pommermanData);

    for(var i=0; i<window._dataForVisualization["bombsData"].length; i++)
    {
        var bombTimeline = [];
        var bombDatum = window._dataForVisualization["bombsData"][i];
        var bombId = bombDatum["bombId"];
        var startStep = bombDatum["stepNumber"];
        var x=startStep;
        var previousPosition = bombDatum["position"];

        

        for(;x<stateSequence.length; x++)
        {
            var temp = {"moved": false, "blast":false, "kicked": false, "kickingAgentId": -1, "step":x};

            if(x>(startStep + 1))
            {
                // if(stateSequence[x]["bombsDictionary"][bombId] == undefined)
                // {
                //     console.log(bombDatum);
                // }
                
                // Check bomb moved in current step
                if(bombId in stateSequence[x]["bombsDictionary"])
                {
                    var currentPosition = stateSequence[x]["bombsDictionary"][bombId]["position"];
                    var bombMoveDistance = Math.abs(currentPosition[0] - previousPosition[0]) + Math.abs(currentPosition[1] - previousPosition[1]);

                    if(bombMoveDistance >=1)
                    {
                        previousPosition[0] = currentPosition[0];
                        previousPosition[1] = currentPosition[1];
                        temp["moved"] = true;
                    }
                }

                // Check bomb Exploded in current step
                if(bombId in stateSequence[x-1]["bombsDictionary"] && !(bombId in stateSequence[x]["bombsDictionary"]))
                {
                    temp["blast"] = true;
                    bombTimeline.push(JSON.parse(JSON.stringify(temp)));
                    break;
                }
                
            }

            bombTimeline.push(JSON.parse(JSON.stringify(temp)));
        }
        window._dataForVisualization["bombsData"][i]["timeline"] = bombTimeline;
    }
    // console.log( window._dataForVisualization["bombsData"]);
}

function calculateVerticalPositionsToAvoidOverlapofBombs()
{
    
    
    var bombsSegregatedByTheirOwnersArray = [[],[],[],[]];

    for(var i=0; i<window._dataForVisualization["bombsData"].length; i++)
    {
        var timelineLength = window._dataForVisualization["bombsData"][i]["timeline"].length;
        window._dataForVisualization["bombsData"][i]["startStep"] = window._dataForVisualization["bombsData"][i]["timeline"][0]["step"];
        window._dataForVisualization["bombsData"][i]["endStep"] = window._dataForVisualization["bombsData"][i]["timeline"][timelineLength -1]["step"] + window.flameDuration;
        var ownerId = window._dataForVisualization["bombsData"][i]["bomber_id"];
        bombsSegregatedByTheirOwnersArray[ownerId].push(window._dataForVisualization["bombsData"][i]);
    }

    // for(var i=0; i< bombsSegregatedByTheirOwnersArray.length; i++)
    // {

    //     for(var j=0; j<bombsSegregatedByTheirOwnersArray[i].length; j++)
    //     {
    //         var numberOfOverlaps = numberOfOverlappingBombs(bombsSegregatedByTheirOwnersArray[i][j]["bombId"], j, bombsSegregatedByTheirOwnersArray[i]  );
    //         bombsSegregatedByTheirOwnersArray[i][j]["numberOfOverlaps"] = numberOfOverlaps;
    //     }
    // }
    // window._dataForVisualization["segregatedBombsData"] = bombsSegregatedByTheirOwnersArray;

    var occupiedPositionsArray = [];
    function firstAvailablePosition(allPositionsArray)
    {
        // for(var y=0; y<allPositionsArray.length; y++)
        // {
        //     if(allPositionsArray[y] == -1)
        //         return y;
        // }
        // console.log("Positions exceeded 13");
        // return y;
        var t =  allPositions.indexOf(-1);
        if(t == -1)
            console.log("array full");
        return t;

    }
    

    for(var i=0; i< bombsSegregatedByTheirOwnersArray.length; i++)
    {
        var allPositions = [];
        var bombId_PosDictionary = {};
        for(var x=0;x<13; x++)
            allPositions.push(-1);

        for(var j=0; j<window._dataForVisualization["timespan"];j++)
        {
            for(var k=0; k<bombsSegregatedByTheirOwnersArray[i].length; k++)
            {
                var bombId = bombsSegregatedByTheirOwnersArray[i][k]["bombId"];

                if(j == bombsSegregatedByTheirOwnersArray[i][k]["endStep"] + 1)
                {
                    var pos = bombId_PosDictionary[bombId];
                    allPositions[pos] = -1;
                }

                else if(j == bombsSegregatedByTheirOwnersArray[i][k]["startStep"])
                {
                    var tempPos = firstAvailablePosition(allPositions);
                    allPositions[tempPos] = 1;
                    
                    bombId_PosDictionary[bombId] = tempPos;
                    bombsSegregatedByTheirOwnersArray[i][k]["numberOfOverlaps"] = tempPos;
                }
            }
        }
    }

    // for(var i=0; i< bombsSegregatedByTheirOwnersArray.length; i++)
    // {

    //     for(var j=0; j<bombsSegregatedByTheirOwnersArray[i].length; j++)
    //     {
    //         var numberOfOverlaps = numberOfOverlappingBombs(bombsSegregatedByTheirOwnersArray[i][j]["bombId"], j, bombsSegregatedByTheirOwnersArray[i]  );
    //         bombsSegregatedByTheirOwnersArray[i][j]["numberOfOverlaps"] = numberOfOverlaps;
    //     }
    // }
    window._dataForVisualization["segregatedBombsData"] = bombsSegregatedByTheirOwnersArray;
}

function numberOfOverlappingBombs(bombId, bombIndexInArray, bombArray)
{
    var startStep = bombArray[bombIndexInArray]["startStep"];
    var endStep = bombArray[bombIndexInArray]["endStep"];
    var numberOfOverlaps = 0;

    for(var i=0; i<bombIndexInArray; i++)
    {
        if(bombArray[i]["bombId"] != bombId)
        {
            if((bombArray[i]["startStep"]>= startStep && bombArray[i]["startStep"]<= endStep) || (bombArray[i]["endStep"]>= startStep && bombArray[i]["endStep"]<= endStep) )
            {
                numberOfOverlaps++;
            }
           
        }
    }
    return numberOfOverlaps;
}

function computeStatsForOverview()
{
    var overviewStatisticsPerGame = [];
    window.maxGameLength = -1;

    for(var i=0; i< window.gamesDataArray.length; i++)
    {
        window.flameDuration = 2;
        window.bombLayoutDictionary = {};

        window.agentIndex_RowidDictionary = {
            0: "e1",
            1: "e3",
            2: "e2",
            3: "e4"
        };
        window.Rowid_agentIndexDictionary = {
            "e1": 0,
            "e3": 1,
        "e2" : 2,
        "e4":3
        };
        window.bombCounter = 0;
        gamesDataArray[i]["state"] = sortSteps(gamesDataArray[i]["state"]);
        // debug();

        // if(i==1)
        // {
        //     console.log("in computeStatsForOverview() ");
        //     console.log(gamesDataArray[i]["state"][94]);
        // }
        window.decodeBoardValueDictionary = {
            10: 0,
            11: 1,
            12: 2,
            13: 3
        };
        var eventSumDictionary = {};
        eventSumDictionary["e1"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0, "kick":0, "extra":0, "range":0, "radio":0};
        eventSumDictionary["e2"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0, "kick":0, "extra":0, "range":0, "radio":0};
        eventSumDictionary["e3"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0, "kick":0, "extra":0, "range":0, "radio":0};
        eventSumDictionary["e4"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0, "kick":0, "extra":0, "range":0, "radio":0};

        if(window.gamesDataArray[i]["state"].length > window.maxGameLength)
            window.maxGameLength = window.gamesDataArray[i]["state"].length;

        
        var eventSequences = getStateSequencesOfAgents(gamesDataArray[i]["state"]);

        calculateStatesOfIndividualBombs(gamesDataArray[i]["state"]);


        
        // var edges = getEdges(eventSequences, temp2, entitiesDictionary);

        // window._dataForVisualization["eventEdges"] = edges;
        for( var j=0; j<eventSequences.length; j++)
        {
            for(var k=0; k<eventSequences[j].length; k++)
            {
                var entityId = agentIndex_RowidDictionary[k];
                if(eventSequences[j][k]["moved"])
                {
                    eventSumDictionary[entityId]["moved"]++;
                }
                if(eventSequences[j][k]["kicked"])
                {
                    eventSumDictionary[entityId]["kicked"]++;
                }
                if(eventSequences[j][k]["pickedPower"])
                {
                    eventSumDictionary[entityId]["pickedPower"]++;
                    if(eventSequences[j][k]["pickedPowerType"]["kick"])
                    {
                        eventSumDictionary[entityId]["kick"]++;
                    }
                    if(eventSequences[j][k]["pickedPowerType"]["extra"])
                    {
                        eventSumDictionary[entityId]["extra"]++;
                    }
                    if(eventSequences[j][k]["pickedPowerType"]["range"])
                    {
                        eventSumDictionary[entityId]["range"]++;
                    }
                }
                
                if(eventSequences[j][k]["laidBomb"])
                {
                    eventSumDictionary[entityId]["laidBomb"]++;
                }
                if(eventSequences[j][k]["death"])
                {
                    eventSumDictionary[entityId]["death"]++;
                }

                eventSumDictionary[entityId]["radio"]+= eventSequences[j][k]["radio"];
            }
        }

        overviewStatisticsPerGame.push(eventSumDictionary);
        

    }
    
    return overviewStatisticsPerGame;
    // console.log(window.overviewStatisticsPerGame);
}

function preprocessData()
{
    window.flameDuration = 2;
    window.bombLayoutDictionary = {};

    window.extraFlamesDictionary = {};

    window.allBombIdsResponsibleForDeath = [];

    
    window.bombCounter = 0;

    window.pommermanData["blob"]["state"] = sortSteps(window.pommermanData["blob"]["state"]);

   
    // {
    //     console.log("in preprocessData() ");
    //     console.log(window.pommermanData["blob"]["state"][94]);
    // }
    window.decodeBoardValueDictionary = {
        10: 0,
        11: 1,
        12: 2,
        13: 3
    };
    window._dataForVisualization = {
        gameName: window.pommermanData["blob"]["config"],
        gameFinishDate: window.pommermanData["blob"]["finished_at"],
        result: window.pommermanData["blob"]["result"],
        timespan : window.pommermanData["blob"]["state"].length,
        
        entities: [],
        events: ["Move", "Lay Bomb", "Pick Power" ,  "Kick","Death"],
        eventsDictionary: {"Move": "moved", "Lay Bomb": "laidBomb", "Kick":"kicked", "Pick Power": "pickedPower", "Death":"death"},
        eventSumDictionary: {}
        
    };
    var temp = window.pommermanData["blob"]["agents"];
    var temp2 = [];
    
    entitiesDictionary = {};
    // Team1
    entitiesDictionary["e1"] = {"name": temp[0], "indexInData":0, "isAgent": true, "image": function(){ return "resources/"+ agentImage(0) ;}};  
    entitiesDictionary["e10"] = {"name": "Bombs Laid", "indexInData":-1, "isAgent": false, "image": "resources/Bomb_default.png"};    

    entitiesDictionary["e2"] = {"name": temp[2], "indexInData":2, "isAgent": true, "image": function(){ return "resources/"+ agentImage(1) ;}};
    entitiesDictionary["e11"] = {"name": "Bombs Laid", "indexInData":-1, "isAgent": false, "image": "resources/Bomb_default.png"};    

    // Team2
    entitiesDictionary["e3"] = {"name": temp[1], "indexInData":1, "isAgent": true, "image": function(){ return "resources/"+ agentImage(2) ;}};
    entitiesDictionary["e12"] = {"name": "Bombs Laid", "indexInData":-1, "isAgent": false, "image": "resources/Bomb_default.png"};    

    entitiesDictionary["e4"] = {"name": temp[3], "indexInData":3, "isAgent": true, "image":function(){ return "resources/"+ agentImage(3) ;}};
    entitiesDictionary["e13"] = {"name": "Bombs Laid", "indexInData":-1, "isAgent": false, "image": "resources/Bomb_default.png"};    


    // entitiesDictionary["e5"] = {"name": "Bomb", "indexInData":-1, "isAgent": false, "image": "resources/Bomb_default.png"};    
    // entitiesDictionary["e6"] = {"name": "Bomb Blast", "indexInData":-1, "isAgent": false};    
    entitiesDictionary["e7"] = {"name": "Extra Bomb", "indexInData":-1, "isAgent": false, "image": "resources/ExtraBomb.png"};    
    entitiesDictionary["e8"] = {"name": "Increase Range", "indexInData":-1, "isAgent": false, "image": "resources/IncrRange.png"};    
    entitiesDictionary["e9"] = {"name": "Can Kick", "indexInData":-1, "isAgent": false, "image": "resources/Kick.png"};    

    temp2.push("e1");
    temp2.push("e10");
    
    temp2.push("e2");
    temp2.push("e11");

    // temp2.push("e5");
    
    temp2.push("e7");
    temp2.push("e8");
    temp2.push("e9");

    temp2.push("e3");
    temp2.push("e12");

    temp2.push("e4");
    temp2.push("e13");

    window.bombRowIdsArray = ["e10", "e11", "e12", "e13"];

    window._dataForVisualization.eventSumDictionary["e1"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0};
    window._dataForVisualization.eventSumDictionary["e2"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0};
    window._dataForVisualization.eventSumDictionary["e3"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0};
    window._dataForVisualization.eventSumDictionary["e4"] = {"moved": 0, "laidBomb": 0, "kicked":0, "pickedPower":0, "death":0};

    _dataForVisualization.entities = temp2;
    
    agentIndexInData = 0;
    var eventSequences = getStateSequencesOfAgents(window.pommermanData["blob"]["state"]);
    calculateStatesOfIndividualBombs(window.pommermanData["blob"]["state"]);
    calculateVerticalPositionsToAvoidOverlapofBombs();
    var edges = getEdges(eventSequences, temp2, entitiesDictionary);

    // console.log(window.pommermanData);
    // console.log(eventSequences);
    // console.log(edges);
    window._dataForVisualization["eventSequences"] = eventSequences;
    window._dataForVisualization["eventEdges"] = edges;
    // console.log(_dataForVisualization);
}

function renderFrame(stateArray, i, video)
{
    video.selectAll("*").remove();
    // var select = $( "#minbeds" );
    // var slider = $( "<div id='slider'></div>" ).insertAfter( select ).slider({
    // min: 1,
    // max: 6,
    // range: "min",
    // value: select[ 0 ].selectedIndex + 1,
    // slide: function( event, ui ) {
    //     select[ 0 ].selectedIndex = ui.value - 1;
    // }
    // });
    $( "#slider" ).slider({
        min:1,
        max: stateArray.length,
        value: i,
        slide: function( event, ui ) {
            // select[ 0 ].selectedIndex = ui.value - 1;
            d3.select("#frame").text(ui.value);
            renderFrame(stateArray, ui.value-1, video);
            // var alpha = ((window.visEndX - window.visStartX)/window.pommermanData["blob"]["state"].length);
            // var currentX = ui.value/alpha + window.visStartX;
            var currentX = window.globalXScale(ui.value-1);
            d3.select("#status").attr("transform", "translate("+ currentX + ","+ 0 +")");
            // d3.select("#status").attr("x", currentX);
            // i = ui.value;
        }
    })

    var board = stateArray[i]["board"];
    for(var j=0; j<board.length; j++)
    {
        for(var k=0; k<board[j].length; k++)
        {
            var imagePath = returnImagePath(board[j][k]);
                // case 9:
                // case 10:
                // case 11:
                // case 12:
                // case 13:
                //         imagePath += "Passage.png";
                //         break;
                
                
            if(board[j][k]>1)
            {
                video.append("image").attrs({
                    "xlink:href":"resources/Passage.png",
                    "width": window.svgWidthHeight/11,
                    "height": window.svgWidthHeight/11,
                    "x": k*window.svgWidthHeight/11,
                    "y": j*window.svgWidthHeight/11
                    // "id": "Image"+j+"_"+k
                });
            }
            
            video.append("image").attrs({
                "xlink:href":imagePath,
                "width": window.svgWidthHeight/11,
                "height": window.svgWidthHeight/11,
                "x": k*window.svgWidthHeight/11,
                "y": j*window.svgWidthHeight/11,
                "id": "Image"+j+"_"+k
            });

            // if(board[j][k] == 4)
            // {
            //     for(var x=0; x<stateArray[i]["flames"].length; x++)
            //     {
            //         if(stateArray[i]["flames"][x]["position"][0] == j && stateArray[i]["flames"][x]["position"][1] == k)
            //         {
            //             video.append("text").text(stateArray[i]["flames"][x]["bombId"]).attrs({
            //                 // "xlink:href":imagePath,
            //                 // "width": window.svgWidthHeight/11,
            //                 // "height": window.svgWidthHeight/11,
            //                 "x": k*window.svgWidthHeight/11 + window.svgWidthHeight/22,
            //                 "y": j*window.svgWidthHeight/11 + window.svgWidthHeight/22,
            //                 "fill":"black",
            //                 "dominant-baseline":"central",
            //                 "text-anchor":"middle"
            //                 // "id": "Image"+j+"_"+k
            //             });
            //         }
            //     }
                
            // }

            // var imagePath2 = "resources/";
            // var isPlayerFlag = false;
            // switch(board[j][k])
            // {
            //     case 9:
            //         imagePath2 += "AgentDummy.png";
            //         isPlayerFlag = true;
            //         break;
            //     case 10:
            //         imagePath2 += "Agent0.png";
            //         isPlayerFlag = true;
            //         break;
            //     case 11:
            //         imagePath2 += "Agent1.png";
            //         isPlayerFlag = true;
            //         break;
            //     case 12:
            //         imagePath2 += "Agent2.png";
            //         isPlayerFlag = true;
            //         break;
            //     case 13:
            //         imagePath2 += "Agent3.png";
            //         isPlayerFlag = true;
            //         break;
            // }
            // if(isPlayerFlag)
            // {
            //     video.append("image").attrs({
            //         "xlink:href":imagePath2,
            //         "width": 50,
            //         "height": 50,
            //         "x": k*50,
            //         "y": j*50
            //     });
            // }
        }
    }
}

function returnImagePath(cellValue)
{
    var imagePath = "resources/";
    switch(cellValue)
    {
        case 0:
            imagePath += "Passage.png";
            break;
        case 1:
            imagePath += "Rigid.png";
            break;
        case 2:
            imagePath += "Wood.png";
            break;
        case 3:
            imagePath += "Bomb_default.png";
            break;
        case 4:
            imagePath += "Flames.png";
            break;
        case 5:
            imagePath += "Fog.png";
            break;
        case 6:
            imagePath += "ExtraBomb.png";
            break;
        case 7:
            imagePath += "IncrRange.png";
            break;
        case 8:
            imagePath += "Kick.png";
            break;
        case 9:
            imagePath += "AgentDummy.png";
            break;
        case 10:
            imagePath += agentImage(0);
            break;
        case 11:
            imagePath +=agentImage(2);
            break;
        case 12:
            imagePath += agentImage(1);
            break;
        case 13:
            imagePath += agentImage(3);
            break;
    }
    return imagePath;
}

function preparePlayback()
{
    d3.select("#video").selectAll("*").remove();

    var gameData = window.pommermanData["blob"];
    var stateArray = window.pommermanData["blob"]["state"];
    var playbackDiv = d3.select("#playbackDiv");
    window.svgWidthHeight = 200;
    var video = d3.select("#video").append("svg").attr("id", "videoSVG").attr("width", svgWidthHeight).attr("height",svgWidthHeight);
    var i=0;
    renderFrame(stateArray, i, video);
    i++;
    window.intervalId = null;
    window.playClicked = false;
    d3.select("#play").on("click", function(){
        if(window.playClicked ==false)
        {
            i = $( "#slider" ).slider("value");
            timeWait = 400;
            window.intervalId = setInterval(function()
                {
                    
                    renderNextFrame(stateArray, i, video);
                    i++; 
                }, timeWait);

                // var index = window.videoIndexBeingPlayed ;
                var sbar = d3.select("#status");
                // var currentX = d3.select("#status").attr("currentX");
                var t = d3.select('#status').node().transform.baseVal[0].matrix;
                var currentX = t["e"];
                // y = t.translate[1];
                var totalDuration = window.pommermanData["blob"]["state"].length * timeWait;
                var visEndX = globalXScale(window.pommermanData["blob"]["state"].length) ;
                var visStartX = globalXScale(0);
                // if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
                {
                    var alpha = ((visEndX - visStartX)/totalDuration);
                    var dur = (currentX - visStartX)/alpha;
                    d3.select("#status").attr("transform","translate("+currentX+",0)" )
                    .transition().duration((totalDuration - dur))
                    .ease(d3.easeLinear)
                    .attr("transform","translate("+(visEndX)+",0)" );
                }
                window.playClicked = true;
        }
    });

    d3.select("#pause").on("click", function(){
        if(window.playClicked == true)
        {
            clearInterval(window.intervalId);
            d3.select("#status").interrupt();
            window.playClicked = false;
                return;
        }
    });
    
    d3.select("#previous").on("click", function(){
        i = $( "#slider" ).slider("value");
        if(i>1)
        {
            clearInterval(intervalId);
            d3.select("#status").interrupt();
            i--;
            $( "#slider" ).slider("value",i);
            d3.select("#frame").text(i);
            d3.select("#status").attr("transform", "translate("+ globalXScale(i) + ","+ 0 +")");
            renderFrame(stateArray, i, video);
        }
        
            return;
    });
    d3.select("#next").on("click", function(){
        i = $( "#slider" ).slider("value");
        if(i<(stateArray.length-1))
        {
            clearInterval(intervalId);
            d3.select("#status").interrupt();
            i++;
            $( "#slider" ).slider("value",i);
            d3.select("#frame").text(i);
            // d3.select("#status").attr("x", globalXScale(i));
            var currentX = d3.select("#status").attr("currentX");
            // d3.select("#status").attr("transform","translate("+( globalXScale(i) - currentX)+",0)" );
            d3.select("#status").attr("transform", "translate("+ globalXScale(i) + ","+ 0 +")");
            renderFrame(stateArray, i, video);
        }
        
            return;
    });
    // for(var i=0; i<stateArray.length; i++)
    // // for(var i=0; i<1; i++)
    // {
    //     // renderFrame(stateArray, i, video);
        
    //     // setTimeout(renderFrame(stateArray, i, video), 1000);

    // }
    
    
    
    function renderNextFrame(stateArray, i, video)
    {
        if(i==stateArray.length)
        {
            clearInterval(intervalId);
            return;
        }
        $( "#slider" ).slider({
            value: i
        });
        d3.select("#frame").text(i);
        d3.selectAll(".backgroundTileImage"+ (i-1)).remove();

        var previousBoard = stateArray[i-1]["board"];
        var board = stateArray[i]["board"];
        for(var j=0; j<board.length; j++)
        {
            for(var k=0; k<board[j].length; k++)
            {
                if(board[j][k] == previousBoard[j][k])
                    continue;
                else
                {
                    if(board[j][k]>8)
                    {
                        video.append("image").attrs({
                            "xlink:href":"resources/Passage.png",
                            "width": window.svgWidthHeight/11,
                            "height": window.svgWidthHeight/11,
                            "x": k*window.svgWidthHeight/11,
                            "y": j*window.svgWidthHeight/11,
                            "class": "backgroundTileImage"+i
                            // "id": "Image"+j+"_"+k
                        });
                    }
                    
                    var imagePath = returnImagePath(board[j][k]);

                    video.append("image").attrs({
                        "xlink:href":imagePath,
                        "width": window.svgWidthHeight/11,
                        "height": window.svgWidthHeight/11,
                        "x": k*window.svgWidthHeight/11,
                        "y": j*window.svgWidthHeight/11,
                        "id": "Image"+j+"_"+k+"_"+i
                    });

                    d3.select("#Image"+j+"_"+k + "_"+(i-1)).remove();
                }
            }
        }
        
    }

}
function sumData( t1, t2)
{
    var sumArray=[];
    for(var i=0; i<t1.length; i++)
    {
        var tempElement = t1[i] + t2[i];
        sumArray.push(tempElement);
    }
    return sumArray;
    }
function calcEventDensityData(eventType, entity, binSize)
{
    var data = window._dataForVisualization["eventSequences"];
    var numBins = Math.ceil(data.length / binSize);
    var outputData = [];

    for(var i=0; i<numBins; i++)
    {
        var count = 0;
        for(var j=0; j<binSize; j++)
        {
            var datumIndex = binSize*i + j;
            if(datumIndex >= data.length)
            {
                outputData.push(count);
                    return outputData;
            }

            if(eventType == "moved" || eventType == "kicked" || eventType == "laidBomb")
            {
                if(data[datumIndex][window.Rowid_agentIndexDictionary[entity]][eventType])
                {
                    count++;
                }
            }
            else if(eventType == "radio" )
            {
                
                count += data[datumIndex][window.Rowid_agentIndexDictionary[entity]][eventType];
            
            }
            else if(eventType == "pickedPower")
            {
                var tempcountOfpowerspickedup = 0;
                var da = data[datumIndex][window.Rowid_agentIndexDictionary[entity]]["pickedPowerType"];
                for(var key in da)
                {
                    if(da[key])
                    {
                        tempcountOfpowerspickedup++;
                    }
                }
                count += tempcountOfpowerspickedup;
            }
            else 
            {
                if(data[datumIndex][window.Rowid_agentIndexDictionary[entity]]["pickedPowerType"][eventType])
                {
                    count++;
                }
            }

        }
        outputData.push(count);
    }
    return outputData;
}

function drawEventHistogram(eventType, entity, binSize, data, counter, root)
{

    var y_Pos = (window.endyPosOfMatrix + counter*(window.maxHeightOfHistogramBars + 5));

    if(root ==undefined)
    {
        root =d3.select("#mainVisualizationGroup").append("g").attr("id", "histo"+entity);
    }
    else
    {
        root.selectAll("*").remove();
        root.remove();
        root =d3.select("#mainVisualizationGroup").append("g").attr("id",  "histo"+entity);
    }
    var maxCharacters = 22;
    var fullName = "";
    var shortName = "";
    if(namesArray[counter -1] == "Team 1")
    {
        
        fullName = "A: "+agentNameSimplify(window.gamesDataArray[0]["agents"][0]);
    }
    else if(namesArray[counter -1] == "Team 2")
    {
        fullName = "B: "+agentNameSimplify(window.gamesDataArray[0]["agents"][1]); 
    }
    if(fullName.length > maxCharacters)
    {
        shortName = fullName.substring(0, maxCharacters-3)+"...";
    }
    else
    {
        shortName = fullName;
    }



    root.append("text").text(shortName+":").attrs({
        "x": 15,
        "y": -maxHeightOfHistogramBars,
        // "font-size":"12px",
        "class": "info",
        "font-weight":"bold",
        "text-anchor":"start",
        "dominant-baseline":"hanging"
    }).append("title").text(fullName);
    
    var gameMetricGroup = root.append("g").attrs({
        "data-toggle": "modal",
        "data-target": "#myModal"
    });
    gameMetricGroup.append("text").text(" "+window.metric_labelDictionary[eventType]).attrs({
        "x": window._leftTextEnd -30,
        "y": -maxHeightOfHistogramBars/2,
        
        "text-anchor":"end",
        "dominant-baseline":"central",
        "class":"info selectedMetric",
        "text-decoration": "underline",
        "cursor":"pointer"
    });
    gameMetricGroup.append("text").text("\ue019").attrs({
        "x": window._leftTextEnd -25,
        "y": -maxHeightOfHistogramBars/2,
        "text-anchor":"start",
        "dominant-baseline":"central",
        "class":"glyphicon",
        "fill": "black",
        "cursor":"pointer"
    });

    if(counter ==2)
    root.append("text").text("(bar width = 10 steps)").attrs({
        "x": window._leftTextEnd -15,
        "y": 5,
        // "font-size":"12px",
        "class": "info",
        "text-anchor":"end",
        "dominant-baseline":"central"
    });

    // var histogramXScale = d3.scaleLinear()
    //                     .domain([ 0, window._dataForVisualization.timespan])
    //                     .range([tableLocations[i+1]["start"], tableLocations[i+1]["end"]] );

    
    
    var widthOfOneBar = window.globalXScale(binSize) - window.globalXScale(0);
    // var numBins = Math.ceil(data.length / binSize);

    for(var i=0; i<data.length; i++)
    {
        var bar = root.append("rect")
                        .attrs({
                            "x": window.globalXScale(binSize * i),
                            "y": 0 - window.histogramYScale(data[i]),
                            "width":widthOfOneBar,
                            "height": window.histogramYScale(data[i]),
                            "fill":"gray"
                        })
        bar.append("svg:title").text(function(){
                        return data[i];
                    });
    }
    root.append("line")
            .attrs({
                "x1": window.globalXScale(0),
                "y1": 0,
                "x2": window.globalXScale(binSize * (data.length)),
                "y2":0,
                "stroke": "grey",
                "stroke-width":"1px",
                // "fill":"gray"
            })
    root.attr("style", "transform: translate(0px,"+y_Pos + "px);");


}




function drawVisualization2(gameIndex)
{
    d3.select("#mainVisualizationGroup").selectAll("*").remove();

    var leftPadding = 0,
    rightPadding = 160,
        // topPadding = 130,
        topPadding = 45,
        bottomPadding = 20,
        width = 1900,
        // width = 1300,  //For teaser
        
        svgHeight = 660,

        

        height = 600,
        // textEnd = 190;
        textEnd = window._leftTextEnd;

        if(window.figureForTeaser )
        {
            height = 450;
            width = 1300;
        }

    var tableTop = 30;

    window.maxHeightOfHistogramBars = 40;

    window.heightOfBombsRow = 100;
    window.visEndX = width - rightPadding;
    window.visStartX = textEnd;
    window.statusHeight =  height + bottomPadding + maxHeightOfHistogramBars;
    var radiusOfSmallDots = 1.5;

    // width = d3.select("#mainDiv").node().getBoundingClientRect().width;

    var radiusOfCircle = 6;
    var glyphOPacity = 0.6;
    var marginTextBeforeMatrix = 50;
    window.videoIndexBeingPlayed = 1;

    d3.select("#mainVisualization").attr("width", width).attr("height", svgHeight);
    var svg = d3.select("#mainVisualizationGroup");
    
    var eventNameArray = _dataForVisualization.events;
    eachColumn = 435;
    window.entities2 = _dataForVisualization.entities;

    var yscale =  d3.scaleBand()
                    .domain(window.entities2)
                    .rangeRound([topPadding, height- bottomPadding])
                    .padding(5);  

    var tempYPosArray=[];
    var everyRowHeightExceptBombsRow = (height-bottomPadding - topPadding - heightOfBombsRow)/ (window.entities2.length -1);
    var tempY = topPadding;
    for(var x=0; x<window.entities2.length; x++)
    {
            if(window.entities2[x] == "e5")
                tempY += 10 + heightOfBombsRow;

            else
                tempY += everyRowHeightExceptBombsRow;
            
                tempYPosArray.push(tempY);
    }
    
    // var yscale = d3.scaleOrdinal()
    //     .domain(window.entities2)
    //     .range(tempYPosArray);

    var heightOfRow = yscale(entities2[1]) - yscale(entities2[0]);
    
    // var colors = ["#ff7f0e", "#1f77b4","#2ca02c","#9467bd","#d62728","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"];
    // var colors = ["#ff7f0e", "#1f77b4","#c51b8a","#9467bd","#d62728","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"];
    // var colors = ['#ff7f00','#80b1d3','#984ea3','#1b9e77',"#850103"];

    // SurVis colors
    // var colors = ["#ec6502", "#5eaacb ", "#eb298d", "#00cc00", "#850103"];
    var colors = ["#ec6502", "#5eaacb ",  "#00cc00", "#eb298d", "#000000"];
    
    // var colors =[ '#ec6502', '#1a8e6a', '#6762a2',  '#0E1EF1','#e10404'];//'#7cc522',  '#eb298d',
    var yLegendGroup = svg.append("g");
    var widthHeightOfImages = 30;

    if(window.figureForTeaser)
    widthHeightOfImages = 25;

    if(isTeamCompetition(window._dataForVisualization.gameName))
    { 
       var cx = 15, cy = yscale("e10") + heightOfRow/2;
        yLegendGroup.append("text").attrs({
            "x":  cx,
            "y": cy,
            "dominant-baseline":"center",
            "text-anchor":"middle",
            "transform":"rotate(-90,"+cx+","+cy+")"
        }).text("Team A");
        startX = cx + 10, startY = yscale("e1");
        yLegendGroup.append("path").attrs({
            "d": "M"+startX + " "+startY + " l -5 0 l 0 "+(3*heightOfRow)+" l 5 0",
            // "d": "M"+startX + " "+startY + " L " + startX +" " + yscale(entities2[i]) +" L "+(startX+arrowWidth)+" "+ yscale(entities2[i]),
            "stroke": "black",
            "stroke-width":"1px",
            "opacity":1,
            "fill":"none"
        })

        cx = 15, cy = yscale("e12") + heightOfRow/2;
        yLegendGroup.append("text").attrs({
            "x":  cx,
            "y": cy,
            "dominant-baseline":"center",
            "text-anchor":"middle",
            "transform":"rotate(-90,"+cx+","+cy+")"
        }).text("Team B");
        startX = cx + 10, startY = yscale("e3");
        yLegendGroup.append("path").attrs({
            "d": "M"+startX + " "+startY + " l -5 0 l 0 "+(3*heightOfRow)+" l 5 0",
            // "d": "M"+startX + " "+startY + " L " + startX +" " + yscale(entities2[i]) +" L "+(startX+arrowWidth)+" "+ yscale(entities2[i]),
            "stroke": "black",
            "stroke-width":"1px",
            "opacity":1,
            "fill":"none"
        })
    }

    cx = 15, cy = yscale("e7") + heightOfRow;
    yLegendGroup.append("text").attrs({
        "x":  cx,
        "y": cy,
        "dominant-baseline":"center",
        "text-anchor":"middle",
        "transform":"rotate(-90,"+cx+","+cy+")"
    }).text("Power-Ups");
    startX = cx + 10, startY = yscale("e7");
    yLegendGroup.append("path").attrs({
        "d": "M"+startX + " "+startY + " l -5 0 l 0 "+(2*heightOfRow)+" l 5 0",
        // "d": "M"+startX + " "+startY + " L " + startX +" " + yscale(entities2[i]) +" L "+(startX+arrowWidth)+" "+ yscale(entities2[i]),
        "stroke": "black",
        "stroke-width":"1px",
        "opacity":1,
        "fill":"none"
    })

    for(var i=0; i<entities2.length; i++)
    {
        
        yLegendGroup.append("text").attrs({
            "x": function(){
                if(window.bombRowIdsArray.indexOf(entities2[i])==-1)
                    return textEnd-marginTextBeforeMatrix;
                else
                {
                    var returnPos = textEnd-marginTextBeforeMatrix + widthHeightOfImages +5;
                    if(window.figureForTeaser)
                        returnPos += 5;
                    return returnPos;
                }
            },
            // "x": 0,
            "y": yscale(entities2[i]),
            "class": "yLegend "+entities2[i]
        }).text(function(){
            var maxCharacters = 17;
            var temp = entitiesDictionary[entities2[i]].name;
            temp = agentNameSimplify(temp);
            if(temp.length >maxCharacters)
                temp = temp.substring(0,maxCharacters-3)+"...";
            // return temp;
            return temp;
        }).append("title").text(function(){
            var temp = entitiesDictionary[entities2[i]].name;
            temp = agentNameSimplify(temp);
            return temp;
        });

        if(window.bombRowIdsArray.indexOf(entities2[i])> -1)
        {
           var parentRowId = entities2[i-1];
           var startX = textEnd - marginTextBeforeMatrix - 60;
           var arrowWidth = 15;
            var startY = yscale(parentRowId) + 20;
            // console.log(parentRowId);
            yLegendGroup.append("path").attrs({
                "d": "M"+startX + " "+startY + " L " + startX +" " + yscale(entities2[i]) +" l "+(arrowWidth)+" 0 l 0 -2 l 4 2 l -4 2 l 0 -2",
                // "d": "M"+startX + " "+startY + " L " + startX +" " + yscale(entities2[i]) +" L "+(startX+arrowWidth)+" "+ yscale(entities2[i]),
                "stroke": "black",
                "stroke-width":"1px",
                "opacity":1,
                "fill":"none"
            })
        }
        
        
        if(window.bombRowIdsArray.indexOf(entities2[i])==-1)
        {
            yLegendGroup.append("image").attrs({
                "xlink:href":entitiesDictionary[entities2[i]].image,
                "width": widthHeightOfImages,
                "height": widthHeightOfImages,
                "x": function(){
                    if(window.figureForTeaser)    
                        return textEnd-marginTextBeforeMatrix + 10;
                    else
                        return textEnd-marginTextBeforeMatrix + 5;
                        
                    },
                "y": yscale(entities2[i])-widthHeightOfImages/2,
                "class": "yLegend "
                // "id": "Image"+j+"_"+k
            });
        }
        if(["e7","e8","e9"].indexOf(entities2[i])>-1)
        {
            var heightOfSubRow = heightOfRow/4;
            var radiusOfCircle = heightOfSubRow/2;
            for(var m=0; m<4; m++)
            {
                var yPos = yscale(entities2[i]) - heightOfRow/2 + m*heightOfSubRow + heightOfSubRow/2;
                // yLegendGroup.append("circle").attrs({
                //     "cx": textEnd - radiusOfCircle,
                //     "cy": yPos,
                //     "r": radiusOfCircle,
                //     "stroke":"black",
                //     "stroke-width":"1px",
                //     "fill":"none"
                // });
                yLegendGroup.append("text").attrs({
                    "x": textEnd - radiusOfCircle,
                    "y": yPos,
                    "dominant-baseline":"central",
                    "font-size": 2*radiusOfCircle -1,
                    "text-anchor":"middle"
                }).text((m+1));
            }
        }


        // if(entities2[i] == "e7")
        // {
        //     yLegendGroup.append("rect").attrs({
        //         "x": textEnd,
        //         "y": yscale("e7") - heightOfRow/2 + 1,
        //         "width": window.visEndX - window.visStartX -1,
        //         "height": 3*heightOfRow,
        //         "fill": "#fbfbfb",
        //         "fill-opacity":0.8
        //     });
        // }

        if(!(entities2[i] in window.Rowid_agentIndexDictionary) && i<(entities2.length-1))
        {
            var stroke = "black";
            if(entities2[i] == "e10" || entities2[i] == "e12")
                stroke = "#e5e5e5";

            yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd - textEnd/2,
                        "y1": yscale(entities2[i]) + heightOfRow/2,
                        "x2": width,
                        "y2": yscale(entities2[i]) + heightOfRow/2,
                        "stroke":stroke,

                        "opacity": 0.8,
                        "stroke-width":"1px"
                    })
            
        }
        if(entities2[i] == "e7" || entities2[i] == "e8" || entities2[i] == "e9" )
        {
            var heightOfPowerRow =  yscale("e8") - yscale("e7");
            var heightOfSubRow = heightOfPowerRow/4;
            var strokeWidth = heightOfSubRow;
            for(var m=1; m<=4; m++)
            {
                yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd,
                        "y1": yscale(entities2[i]) - heightOfRow/2 + m*heightOfSubRow - heightOfSubRow/2 ,
                        "x2": width-rightPadding,
                        "y2": yscale(entities2[i]) - heightOfRow/2 + m*heightOfSubRow - heightOfSubRow/2,
                        "stroke":function(){
                            if(m%2 ==1)
                                return "lightgrey";
                            else
                                return "#fcfcfc";
                        },
                        // "stroke-dasharray":"4 4",
                        "opacity": 0.2,
                        "stroke-width":strokeWidth
                    })
            }
        }

    }

    // yLegendGroup.append("line")
    //                 .attrs({
    //                     "x1": textEnd,
    //                     "y1":(topPadding-2*tableTop),
    //                     "x2":  width,
    //                     "y2": (topPadding-2*tableTop),
    //                     "stroke":"black",
    //                     // "stroke-dasharray":"5 5",
    //                     "stroke-width":"1px"
    //                 });
    // yLegendGroup.append("line")
    //                 .attrs({
    //                     "x1": textEnd,
    //                     "y1":(topPadding-tableTop),
    //                     "x2":  width,
    //                     "y2": (topPadding-tableTop),
    //                     "stroke":"black",
    //                     // "stroke-dasharray":"5 5",
    //                     "stroke-width":"1px"
    //                 });
    yLegendGroup.append("line")
                    .attrs({
                        "x1": textEnd,
                        "y1": yscale(entities2[0]) - heightOfRow/2,
                        "x2":  width - rightPadding,
                        "y2": yscale(entities2[0]) - heightOfRow/2,
                        "stroke":"black",
                        // "stroke-dasharray":"5 5",
                        "stroke-width":"1px"
                    });

    var yPosGameTimelineLegend = topPadding - 15;

    if(window.figureForTeaser)
                    yPosGameTimelineLegend +=7;

    svg.append("path").attrs({
        // "marker-end": 'url(#head)',
        "stroke-width": "1px",
        "fill":"black",
        "stroke":"black",
        "d": function(){
            var halfWidth = 125;
            var centreX = (width-textEnd)/2 + textEnd;
            var yloc = yPosGameTimelineLegend;
            var st = "M "+(centreX - halfWidth)+", "+(yloc)+" H "+(centreX + halfWidth) + " l 0 -3 l 3 3 l -3 3 l 0 -3";
            return st;
        }
    });
    var textElm = svg.append("text").text("Game Timeline (Steps)").attrs({
        "x": (width-textEnd)/2 + textEnd,
        // "y": height-bottomPadding/2,
        "y":yPosGameTimelineLegend,
        "dominant-baseline":"central",
        "text-anchor":"middle",
        "visibility":"hidden",
    });

   

    var backRect = textElm.node().getBBox();
    svg.append("rect").attrs({
        "x": backRect.x,
        "y": backRect.y,
        "width": backRect.width,
        "height": backRect.height,
        "fill": "white"
    });
    svg.append("text").text("Game Timeline (Steps)").attrs({
        "x": (width-textEnd)/2 + textEnd,
        // "y": height-bottomPadding/2,
        "y":yPosGameTimelineLegend,
        "dominant-baseline":"central",
        "text-anchor":"middle",
        
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
    var topLegendGroup = svg.append("g");
    var playersString="";
    var playersStringLeft="";
    var playersStringRight="";
    var gameResultString = "";

    if(isTeamCompetition(window._dataForVisualization.gameName))
    {
        if(window.pommermanData["blob"]["agents"][0] == window.pommermanData["blob"]["agents"][2] && window.pommermanData["blob"]["agents"][1] == window.pommermanData["blob"]["agents"][3])
        {    
            playersString = agentNameSimplify(window.pommermanData["blob"]["agents"][0]) +" vs. "+ agentNameSimplify(window.pommermanData["blob"]["agents"][1]);
            playersStringLeft = agentNameSimplify(window.pommermanData["blob"]["agents"][0]);
            playersStringRight = agentNameSimplify(window.pommermanData["blob"]["agents"][1]);

            if(window.pommermanData["blob"]["result"]["name"] == "Tie")
                gameResultString = "It's a Tie!";
            else
            {
                var agentIndex = -1; // window.pommermanData["blob"]["result"]["winners"][0];
                if("winners" in window.pommermanData["blob"]["result"])
                {
                    agentIndex = window.pommermanData["blob"]["result"]["winners"][0];
                }
                else if("winners" in window.pommermanData["blob"])
                {
                    agentIndex = window.pommermanData["blob"]["winners"][0];
                }

                gameResultString = agentNameSimplify(window.pommermanData["blob"]["agents"][agentIndex]) +" wins!";
            }
        }   
        else
        {
            playersString = agentNameSimplify(window.pommermanData["blob"]["agents"][0]) + ", "+ agentNameSimplify(window.pommermanData["blob"]["agents"][2]) + " vs. "+ agentNameSimplify(window.pommermanData["blob"]["agents"][1]) + ", "+agentNameSimplify(window.pommermanData["blob"]["agents"][3]);
            playersStringLeft = agentNameSimplify(window.pommermanData["blob"]["agents"][0]) + ", "+ agentNameSimplify(window.pommermanData["blob"]["agents"][2]);
            playersStringRight = agentNameSimplify(window.pommermanData["blob"]["agents"][1]) + ", "+ agentNameSimplify(window.pommermanData["blob"]["agents"][3]);

            if(window.pommermanData["blob"]["result"]["name"] == "Tie")
                gameResultString = "It's a Tie!";
            else
            {
                var agentIndex1 = -1;
                var agentIndex2 = -1;
                if("winners" in window.pommermanData["blob"]["result"])
                {
                    agentIndex1 = window.pommermanData["blob"]["result"]["winners"][0];
                    agentIndex2 = window.pommermanData["blob"]["result"]["winners"][1];
                }
                else if("winners" in window.pommermanData["blob"])
                {
                    agentIndex1 = window.pommermanData["blob"]["winners"][0];
                    agentIndex2 = window.pommermanData["blob"]["winners"][1];
                }

                gameResultString = agentNameSimplify(window.pommermanData["blob"]["agents"][agentIndex1]) + " and " + agentNameSimplify(window.pommermanData["blob"]["agents"][agentIndex2]) + " wins!";
                
            }
        }
    }
    else
    {
        playersString = agentNameSimplify(window.pommermanData["blob"]["agents"][0]) + " vs. "+ agentNameSimplify(window.pommermanData["blob"]["agents"][2]) + " vs. "+ agentNameSimplify(window.pommermanData["blob"]["agents"][1]) + "vs. "+agentNameSimplify(window.pommermanData["blob"]["agents"][3]);
        playersStringLeft = agentNameSimplify(window.pommermanData["blob"]["agents"][0]) + " vs. "+ agentNameSimplify(window.pommermanData["blob"]["agents"][2]) ;
        playersStringRight = agentNameSimplify(window.pommermanData["blob"]["agents"][1]) + " vs. "+ agentNameSimplify(window.pommermanData["blob"]["agents"][3]) ;
        if(window.pommermanData["blob"]["result"]["name"] == "Tie")
                gameResultString = "It's a Tie!";
            else
            {
                var agentIndex1 = window.pommermanData["blob"]["result"]["winners"][0];

                gameResultString = agentNameSimplify(window.pommermanData["blob"]["agents"][agentIndex1]) + " wins!";
                
            }

    }

    // topLegendGroup.append("text").text(playersString).attrs({
    //     x: width/2 ,
    //     y: (topPadding-4*tableTop),
    //     "dominant-baseline":"middle",
    //     "text-anchor":"middle",
    //     "class": "largeText"
    // });

 
    
    var overviewSVG = d3.select("#overviewSVG");

    // overviewSVG.append("text").text(playersString).attrs({
    //     x: 1920/2 ,
    //     y: window.endOfRows + 4*window.widthOfCell,
    //     "dominant-baseline":"middle",
    //     "text-anchor":"middle",
    //     "class": "largeText svgText" ,
    
    // });
    var spaceBetweenStringAndVS = 20;
    overviewSVG.append("text").text("vs.").attrs({
        x: window.overviewMiddleXPos ,
        y: window.endOfRows + 5*window.widthOfCell,
        "dominant-baseline":"middle",
        "text-anchor":"middle",
        "class": "largeText svgText" ,
    
    });
    overviewSVG.append("text").text(playersStringLeft).attrs({
        x: window.overviewMiddleXPos - spaceBetweenStringAndVS ,
        y: window.endOfRows + 5*window.widthOfCell,
        "dominant-baseline":"middle",
        "text-anchor":"end",
        "class": "largeText svgText" ,
    
    });
    overviewSVG.append("text").text(playersStringRight).attrs({
        x: window.overviewMiddleXPos + spaceBetweenStringAndVS,
        y: window.endOfRows + 5*window.widthOfCell,
        "dominant-baseline":"middle",
        "text-anchor":"start",
        "class": "largeText svgText" ,
    
    });

    if(isTeamCompetition(window._dataForVisualization.gameName))
    {
        overviewSVG.append("text").text("vs.").attrs({
            x: window.overviewMiddleXPos ,
            y: window.endOfRows + 6*window.widthOfCell,
            "dominant-baseline":"middle",
            "text-anchor":"middle",
            "class": "svgText" ,
        
        });

        overviewSVG.append("text").text("(Team A").attrs({
            x: window.overviewMiddleXPos  -spaceBetweenStringAndVS,
            y: window.endOfRows + 6*window.widthOfCell,
            "dominant-baseline":"middle",
            "text-anchor":"end",
            "class": "svgText" ,
        
        });
        overviewSVG.append("text").text("Team B)").attrs({
            x: window.overviewMiddleXPos  + spaceBetweenStringAndVS,
            y: window.endOfRows + 6*window.widthOfCell,
            "dominant-baseline":"middle",
            "text-anchor":"start",
            "class": "svgText" ,
        
        });

        
    }
    // topLegendGroup.append("text").text("Type: ").attrs({
    //     x: 0,
    //     y: "6pt",
    //     "text-anchor":"start",
    //     "dominant-baseline":"middle",
    //     "class": "info"
    // }).append("tspan").text(window._dataForVisualization.gameName).attr("class","boldText");
    var startXOfLabels = 20;
    overviewSVG.append("text").text("Selected Game #: ").attrs({
        x: startXOfLabels,
        y: window.endOfRows + 5*window.widthOfCell,
        "text-anchor":"start",
        "dominant-baseline":"middle",
        "class": "info  svgText"
    }).append("tspan").text(parseInt(gameIndex)+1).attr("class","boldText");

    overviewSVG.append("text").text("Type: ").attrs({
        x: startXOfLabels,
        y: window.endOfRows + 6*window.widthOfCell,
        "text-anchor":"start",
        "dominant-baseline":"middle",
        "class": "info  svgText"
    }).append("tspan").text(window._dataForVisualization.gameName).attr("class","boldText");

    // topLegendGroup.append("text").text("Game length: ").attrs({
    //     x: 0,
    //     y: "22pt",
    //     "dominant-baseline":"middle",
    //     "text-anchor":"start",
    //     "class": "info"
    // }).append("tspan").text(window._dataForVisualization.timespan + " steps").attr("class","boldText");
    var secondColumn = 250;
    overviewSVG.append("text").text("Game length: ").attrs({
        x: startXOfLabels+ secondColumn,
        y:  window.endOfRows + 5*window.widthOfCell,
        "dominant-baseline":"middle",
        "text-anchor":"start",
        "class": "info  svgText"
    }).append("tspan").text(window._dataForVisualization.timespan + " steps").attr("class","boldText");

    // topLegendGroup.append("text").text("Result: ").attrs({
    //     x: 0 ,
    //     y: "38pt",
    //     "text-anchor":"start",
    //     "dominant-baseline":"middle",
    //     "class": "info"
    // }).append("tspan").text(gameResultString).attr("class","boldText");

    overviewSVG.append("text").text("Result: ").attrs({
        x: startXOfLabels + secondColumn,
        y: window.endOfRows + 6*window.widthOfCell,
        "text-anchor":"start",
        "dominant-baseline":"middle",
        "class": "info  svgText"
    }).append("tspan").text(gameResultString).attr("class","boldText");
    

    // topLegendGroup.append("text").text("Date: "+window._dataForVisualization.gameFinishDate).attrs({
    //     x: textEnd + 350,
    //     y: (topPadding-2*tableTop),
    //     "dominant-baseline":"middle"
    // });

    var eventLegendGroup = svg.append("g");
    var rectX , rectY, rectWidth = 0, rectHeight = 0;
    // var distanceBetweenCircles = (width - textEnd)/(eventNameArray.length + 1);
    var distanceBetweenCircles = 130;
    var nextStartingPosition = textEnd + 120;

    for(var i=0; i<eventNameArray.length; i++)
    {
        var eventKey = window._dataForVisualization.eventsDictionary[eventNameArray[i]];
        var eventGroup = eventLegendGroup.append("g").attr("type", eventNameArray[i]).attr("cursor","pointer").attr("index", i).attr("eventKey", eventKey);
        var checkboxwidth = 10;

        var checkboxXPos = nextStartingPosition - radiusOfCircle - 2*checkboxwidth;
        var checkboxYPos = (topPadding-tableTop) - checkboxwidth/2;
        eventGroup.append("rect").attrs({
            "x": checkboxXPos ,
            "y": checkboxYPos,
            "width": checkboxwidth,
            "height": checkboxwidth,
            "fill":"white",
            "stroke": "black",
            "stroke-width":"1px",
            "class":"checkBoxes",
            "id": "checkbox"+i,
            "index": i,
            "checked": function(){
                var eventKey = window._dataForVisualization.eventsDictionary[eventNameArray[i]];
                if(window.highlightEvents[eventKey] == true)
                {
                    return "true";
                }
                else
                    return "false";
            }
        });
        

        eventGroup.append("path").attrs({
            "d": "M "+checkboxXPos+" "+ (topPadding-tableTop - 2)+" l "+(checkboxwidth/2)+" "+ (checkboxwidth/2) + " l "+ (checkboxwidth)+" -"+checkboxwidth,
            "stroke": "black",
            "stroke-width":"2px",
            "opacity":1,
            "visibility": function(){
                    var eventKey = window._dataForVisualization.eventsDictionary[eventNameArray[i]];
                    if(window.highlightEvents[eventKey] == true)
                    {
                        return "visible";
                    }
                    else
                        return "hidden";
                },
            "fill":"none",
            "id": "checkMark"+i
        });

        if(eventNameArray[i] == "Move")
        {
            
            eventGroup.append("rect").attrs({
                // "x": textEnd + i*distanceBetweenCircles - radiusOfCircle,
                "x": nextStartingPosition - radiusOfCircle,
                "y": (topPadding-tableTop) - radiusOfCircle/2,
                "width": 3*radiusOfCircle,
                "height": radiusOfCircle,
                "fill-opacity":glyphOPacity,
                fill:function(){
                    return colors[i];
                }
            });
        }
        else{
            eventGroup.append("circle").attrs({
                // cx: textEnd + i*distanceBetweenCircles,
                cx: nextStartingPosition,
                cy: (topPadding-tableTop),
                r: 2*radiusOfCircle,
                "fill-opacity":function(){
                    // if(eventNameArray[i] == "Death")
                    // {
                    //     return 1;
                    // }
                    // else
                        return glyphOPacity;    
                },
                fill:function(){
                    return colors[i];
                }
            });
        }
        
        var textElm = eventGroup.append("text").attrs({
            // x: textEnd + i*distanceBetweenCircles + 2*radiusOfCircle + 5,
            x: nextStartingPosition + 2*radiusOfCircle + 5,
            y: (topPadding-tableTop),
            "dominant-baseline":"central"
        }).text(function(){
            return eventNameArray[i];
        });

        var textRect = textElm.node().getBBox();
        nextStartingPosition = textRect.x + textRect.width + 50;
        
        if(i == (eventNameArray.length -1))
        {
            rectWidth = textEnd + i*distanceBetweenCircles  ;
            rectHeight = 25 ;
        }

        eventGroup.on("mousedown", function(){
            var index = d3.select(this).attr("index");
            var eventKey =  d3.select(this).attr("eventKey");
            if(d3.select("#checkbox"+index).attr("checked") == "false")
            {
                d3.select("#checkMark"+index).attr("visibility", "visible");
                d3.select("#checkbox"+index).attr("checked", "true");
                window.highlightEvents[eventKey] = true;
            }
            else
            {
                d3.select("#checkMark"+index).attr("visibility", "hidden");
                d3.select("#checkbox"+index).attr("checked", "false");
                window.highlightEvents[eventKey] = false;


            }
            highlightEventsFunc();
        });

        // eventGroup.on("mouseenter", function(){
        //     d3.selectAll(".hyperEdges").attr("opacity",0.1);
        //     d3.selectAll(".hyperNodes").attr("fill-opacity",0.1);
        //     d3.selectAll(".bomb").attr("opacity",0.1);
        //     var thisEventType = d3.select(this).attr("type");
        //     // console.log( window._dataForVisualization.eventsDictionary[thisEventType]);
        //     d3.selectAll("line."+ window._dataForVisualization.eventsDictionary[thisEventType]).attr("opacity",1.0);
        //     d3.selectAll("g."+ window._dataForVisualization.eventsDictionary[thisEventType]).attr("opacity",1.0);
        //     // d3.selectAll("rect."+ window._dataForVisualization.eventsDictionary[thisEventType]).attr("fill-opacity",1.0);
        //     if(thisEventType == "Move")
        //         d3.selectAll(".bomb.moved").attr("opacity",0.8);

        //     if(window._dataForVisualization.eventsDictionary[thisEventType] == "death")
        //     {
        //         d3.selectAll(".killerBomb").attr("opacity",1.0);
        //         d3.selectAll(".killerBomb").selectAll(".moved").attr("opacity",0.8);
        //         d3.selectAll("line.killerKick").attr("opacity", 1);
        //         d3.selectAll("circle.killerKick").attr("fill-opacity",glyphOPacity);
        //     }
        //     d3.selectAll("."+ window._dataForVisualization.eventsDictionary[thisEventType]).attr("fill-opacity",0.8);

        // });
        // eventGroup.on("mouseout", function(){
        //     d3.selectAll(".hyperEdges").attr("opacity", glyphOPacity);
        //     d3.selectAll(".hyperNodes").attr("fill-opacity", glyphOPacity);
        //     d3.selectAll(".bomb").attr("opacity",1);
        //     highlightEventsFunc();

        // });

      
    }
    // eventLegendGroup.append("image")
    //             .attrs({
    //             "xlink:href": "images/bombLegend.png",
    //             "x": 0,
    //             "y": 0,
    //             "width": 200,
    //             "height": 4*radiusOfCircle 
    //         });
    

    var tempG = svg.append("g").attr("id", "bombLegend").attr("cursor","pointer").attr("index", 5).attr("eventKey", "allBombs");
    var lengthOfArrow = distanceBetweenCircles/3;

    checkboxXPos = -65;
    checkboxYPos = ( radiusOfCircle + 3);
    tempG.append("rect").attrs({
        "x": checkboxXPos ,
        "y": checkboxYPos,
        "width": checkboxwidth,
        "height": checkboxwidth,
        "fill":"white",
        "stroke": "black",
        "stroke-width":"1px",
        "class":"checkBoxes",
        "id": "checkbox5",
        "index": 5,
        "checked": function(){
            var eventKey = "allBombs";
            if(window.highlightEvents[eventKey] == true)
            {
                return "true";
            }
            else
                return "false";
        }
    });
    

    tempG.append("path").attrs({
        "d": "M "+checkboxXPos+" "+ (checkboxYPos + 2)+" l "+(checkboxwidth/2)+" "+ (checkboxwidth/2) + " l "+ (checkboxwidth)+" -"+checkboxwidth,
        "stroke": "black",
        "stroke-width":"2px",
        "opacity":1,
        "visibility": function(){
            var eventKey = "allBombs";
                if(window.highlightEvents[eventKey] == true)
                {
                    return "visible";
                }
                else
                    return "hidden";
            },
        "fill":"none",
        "id": "checkMark5"
    });


    tempG.append("circle").attrs({
        "cx": 0,
        "cy": ( radiusOfCircle + 3),
        "r": radiusOfCircle,
        "fill":"none",
        "fill-opacity":glyphOPacity,
        "stroke-width":"1px",
        "stroke":"black",
        // "opacity":glyphOPacity
    });

    tempG.append("line").attrs({
        "x1":  radiusOfCircle,
        "y1":  ( radiusOfCircle + 3),
        "x2":  lengthOfArrow,
        "y2":  ( radiusOfCircle + 3),
        "fill":"none",
        "stroke": "black",
        // "stroke-opacity": glyphOPacity,
        "stroke-width": "1px",
        "stroke-dasharray": "2,2"
    });
    tempG.append("rect").attrs({
        "x": lengthOfArrow ,
        "y": ( 4),
        "height": 2*radiusOfCircle -2,
        "width": 40,
        "fill":"grey",
        "fill-opacity":glyphOPacity,
        "stroke": "black",
        "stroke-width": "1px"
    });
    tempG.append("text").attrs({
        "x":  20,
        "y": ( 2*radiusOfCircle + 6),
        "text-anchor":"end",
        "dominant-baseline":"hanging"
    }).text("Laid Bomb");
    tempG.append("text").attrs({
        "x":  lengthOfArrow ,
        "y": ( 2*radiusOfCircle + 6),
        "text-anchor":"start",
        "dominant-baseline":"hanging"
    }).text("Blast Duration");
    tempG.attr("transform", "translate("+ (nextStartingPosition-textEnd +70) +",0)");

    // eventLegendGroup.append(tempG);
    rectWidth += 150;
    rectX = (width-leftPadding)/2 + leftPadding - rectWidth/2;
    rectY = 1;
    // eventLegendGroup.attr("transform", "translate("+(rectX - 60)+",0)");
    eventLegendGroup.attr("transform", "translate("+(-textEnd +40)+",0)");

    svg.append("text").attrs({
        // "x": nextStartingPosition  - textEnd + 220,
        "x": 30,
        "y": (topPadding - tableTop),
        "font-size": "12px",
        "dominant-baseline": "central",
        "text-anchor":"start"
    }).text("[Show only] >>");

    svg.append("rect").attrs({
        // "x": rectX + 120,
        "x": 20,
        "y": rectY,
        "width": rectWidth,
        "height": rectHeight +3,
        "stroke": "black",
        "fill":"none",
        "stroke-width": "1px"
    });

    // Draw Event circles
    var data = window._dataForVisualization["eventSequences"];
    // var xscale = d3.scaleLinear().domain([0, (data.length-1) + 3]).range([textEnd, width-rightPadding]);
    // var alpha = (window.maxGameLength +2 )/(width-rightPadding - textEnd);
    // var maxRange = ((data.length+2) /(alpha)) + textEnd;
    var xscale = d3.scaleLinear().domain([0, window.maxGameLength+2]).range([textEnd,  width-rightPadding]);
    window.globalXScale = xscale;

    if(window.figureForTeaser)
        xscale = d3.scaleLinear().domain([0, data.length+2]).range([textEnd,  width-rightPadding]);

    var eventGroup = svg.append("g");

    var bombLegend = d3.select("#bombLegend");

    // bombLegend.on("mouseenter", function(){
    //     d3.selectAll(".hyperEdges").attr("opacity",0.1);
    //     d3.selectAll(".hyperNodes").attr("fill-opacity",0.1);
    //     d3.selectAll(".bomb").attr("opacity",1);
    // });

    // bombLegend.on("mouseout", function(){
    //     d3.selectAll(".hyperEdges").attr("opacity", glyphOPacity);
    //     d3.selectAll(".hyperNodes").attr("fill-opacity", glyphOPacity);
    //     d3.selectAll(".bomb").attr("opacity",1);
    //     highlightEventsFunc();
    // });

    bombLegend.on("mousedown", function(){
        var index = 5;
        var eventKey =  "allBombs"
        if(d3.select("#checkbox"+index).attr("checked") == "false")
        {
            d3.select("#checkMark"+index).attr("visibility", "visible");
            d3.select("#checkbox"+index).attr("checked", "true");
            window.highlightEvents[eventKey] = true;
        }
        else
        {
            d3.select("#checkMark"+index).attr("visibility", "hidden");
            d3.select("#checkbox"+index).attr("checked", "false");
            window.highlightEvents[eventKey] = false;


        }
        highlightEventsFunc();
    });

    // Draw Ticks at some interval
    
    var tickInterval = 50;
    var tickLength = 8;
    var tickFontSize = 12;
    var limit = window.maxGameLength+window.flameDuration;

    if(window.figureForTeaser)
        limit = window.pommermanData["blob"]["state"].length + window.flameDuration;

    for(var z = 0; z<(limit); z= z+tickInterval)
    {
        var stepNum = -1;
        if(z>1)
            stepNum = z-1;
         
        var tickX = xscale(stepNum+1);
        var tickY = yscale(entities2[0]) - heightOfRow/2;
        // if(z==-1)
        // {
        //     stepNum = 0;
        //     tickX = xscale(stepNum);

        // }

        svg.append("line")
        .attrs({
            "x1": tickX,
            "y1":tickY,
            "x2":  tickX,
            "y2":tickY - tickLength,
            "stroke":"black",
            // "stroke-dasharray":"5 5",
            "stroke-width":"1px"
        });
        svg.append("text").attrs({
            "x": tickX,
            "y": tickY - tickLength - 2,
            "font-size":tickFontSize,
            "text-anchor":function(){
                // if( z == (window.maxGameLength+window.flameDuration-1))
                if( stepNum == (799))
                    return "end";
                else
                    return "middle";
            },
            "dominant-baseline":"end"
        }).text(function(){
            if(z==0)
                return 1;
            else
                return stepNum+1}
            );

    }

    //Draw horizontal bar for current game length
    var gameLengthBar = svg.append("rect").attrs({
        "x":xscale(0),
        "y":  yscale(entities2[0]) - heightOfRow/2 - tickLength ,
        "width": xscale(window._dataForVisualization["timespan"]) - xscale(0),
        "height": tickLength ,
        "fill": "grey",
        "opacity":0.3,
        "cursor":"pointer"
    });
    gameLengthBar.on("mousedown", function(d,i){
        if(window.playClicked == true)
        {
            clearInterval(window.intervalId);
            d3.select("#status").interrupt();
            window.playClicked = false;
                
        }
        var sbar = d3.select("#status");
        // var currentX = d3.select("#status").attr("currentX");
        // var t = d3.select('#status').node().transform.baseVal[0].matrix;
        var currentX =(d3.event.offsetX )*(1/window.zoomFactor);
        // console.log(d3.event.pageX, d3.event);
        var video = d3.select("#videoSVG");

        // y = t.translate[1];
        var numSteps = window.pommermanData["blob"]["state"].length;
        var visEndX = globalXScale(window.pommermanData["blob"]["state"].length) ;
        var visStartX = globalXScale(0);
        var alpha = ((visEndX - visStartX)/numSteps);
        var currentStepNum = Math.floor((currentX - visStartX)/alpha);
        $( "#slider" ).slider("value",currentStepNum);
        d3.select("#frame").text(currentStepNum);
        d3.select("#status").attr("transform", "translate("+ globalXScale(currentStepNum) + ","+ 0 +")");
        renderFrame(window.pommermanData["blob"]["state"], currentStepNum, video);

        
       


    });

    svg.append("line")
        .attrs({
            "x1": xscale(window._dataForVisualization["timespan"]),
            "y1": yscale(entities2[0]) - heightOfRow/2 - tickLength - tickFontSize -5,
            "x2":  xscale(window._dataForVisualization["timespan"]),
            "y2": yscale(entities2[0]) - heightOfRow/2 + tickLength ,
            // "y2": yscale(entities2[0]) - heightOfRow/2 - tickLength - tickFontSize + window.statusHeight  ,
            "stroke":"black",
            "stroke-dasharray":"4 4",
            "stroke-width":"1px"
        });
    

    for(var j=0; j<data.length; j++)
    {
        for(var k=0; k<data[j].length; k++)
        {
            var x_Pos = xscale(j);
            var entityId = agentIndex_RowidDictionary[k];
            var numEvents = 0;
            // switch(k)
            // {
            //     case 0: entityId = "e1";break;
            //     case 1: entityId = "e3";break;
            //     case 2: entityId = "e2";break;
            //     case 3: entityId = "e4";break;
            // }
            var y_Pos = yscale(entityId);

            if(data[j][k]["moved"])
            {
                
                // eventGroup.append("circle").attrs({

                //     cx: x_Pos,
                //     cy: y_Pos ,
                //     r: radiusOfCircle/2,
                //     "fill-opacity":glyphOPacity,
                //     fill:function(){
                //         return colors[0];
                //     }
                // });

                var spaceBetweenTimesteps = xscale(2) - xscale(1);
                var heightOfRectangle = radiusOfCircle/2;
                eventGroup.append("rect").attrs({
                    x: x_Pos,
                    y: y_Pos - heightOfRectangle/2,
                    rx: 0,
                    ry: 0,
                    width: spaceBetweenTimesteps,
                    height: heightOfRectangle,
                    "fill": colors[0],
                    "fill-opacity":glyphOPacity,
                    "class": "hyperNodes moved"
                });
                window._dataForVisualization.eventSumDictionary[entityId]["moved"]++;

            }

            

            if(data[j][k]["kicked"])
            {
                var killerKick = "";
                if(window.allBombIdsResponsibleForDeath.indexOf(data[j][k]["bombId"]) >=0 )
                {
                    killerKick = "killerKick";
                }

                numEvents++;
                eventGroup.append("circle").attrs({
                    cx: x_Pos,
                    cy: y_Pos - (numEvents -1)*2*radiusOfCircle,
                    r: radiusOfCircle,
                    "fill-opacity":glyphOPacity,
                    fill:function(){
                        return colors[3];
                    },
                    "class": "hyperNodes kicked "+killerKick
                }).append("title").text(j);
                window._dataForVisualization.eventSumDictionary[entityId]["kicked"]++;

            }
             
            if(data[j][k]["pickedPower"])
            {
                numEvents++;
                eventGroup.append("circle").attrs({
                    cx: x_Pos,
                    cy: y_Pos - (numEvents -1)*2*radiusOfCircle,
                    r: radiusOfCircle,
                    "fill-opacity":glyphOPacity,
                    fill:function(){
                        return colors[2];
                    },
                    "class": "hyperNodes pickedPower"
                });
                window._dataForVisualization.eventSumDictionary[entityId]["pickedPower"]++;

            }
            if(data[j][k]["laidBomb"])
            {
                numEvents++;
                eventGroup.append("circle").attrs({
                    cx: x_Pos,
                    cy: y_Pos - (numEvents -1)*2*radiusOfCircle,
                    r: radiusOfCircle,
                    "fill-opacity":glyphOPacity,
                    fill:function(){
                        return colors[1];
                    },
                    "class": "hyperNodes laidBomb"
                });
                window._dataForVisualization.eventSumDictionary[entityId]["laidBomb"]++;

            } 

            if(data[j][k]["death"])
            {
                numEvents++;
                eventGroup.append("circle").attrs({
                    cx: x_Pos,
                    cy: y_Pos - (numEvents -1)*2*radiusOfCircle,
                    r: radiusOfCircle,
                    "fill-opacity":glyphOPacity,
                    fill:function(){
                        return colors[4];
                    },
                    "class": "hyperNodes death"
                });
                window._dataForVisualization.eventSumDictionary[entityId]["death"]++;

            }
        }
    }

    // Draw Bombs Timeline

    var segregatedBombs = window._dataForVisualization["segregatedBombsData"];
    for(var x=0; x< segregatedBombs.length; x++)
    {
        var bombGroup = svg.append("g");

        for(var y=0; y<segregatedBombs[x].length; y++)
        {
            var bombsData = segregatedBombs[x];
            var classString = "bomb";
            var individualBombGroup = bombGroup.append("g");

            for(var z=0; z<segregatedBombs[x][y]["timeline"].length; z++)
            {
                var rowId = "";
                switch(bombsData[y]["bomber_id"])
                {
                    case 0: rowId = "e10"; break;
                    case 1: rowId = "e12"; break;
                    case 2: rowId = "e11"; break;
                    case 3: rowId = "e13"; break;
                }
                
                x_Pos = xscale(bombsData[y]["timeline"][z]["step"]);
                var numOverlaps = bombsData[y]["numberOfOverlaps"];
                // var subRowHeight = window.heightOfBombsRow/4;
                // var trowindex = -1;
                // switch(bombsData[x]["bomber_id"])
                // {
                //     case 0: trowindex = 3; break;
                //     case 1: trowindex = 2; break;
                //     case 2: trowindex = 1; break;
                //     case 3: trowindex = 0; break;
                // }
                // y_Pos = yscale("e5") - subRowHeight* trowindex;
                // console.log(heightOfRow);
                y_Pos = yscale(rowId) + numOverlaps*2*radiusOfCircle - heightOfRow/2 - 5 ;

                var bombId = bombsData[y]["bombId"];
                if(!(bombId in window.bombLayoutDictionary))
                {
                    window.bombLayoutDictionary[bombId] = {"yPos": y_Pos};
                }

                if(window.allBombIdsResponsibleForDeath.indexOf(bombId) >=0)
                {
                    // individualBombGroup.attr("class", "bomb killerBomb" );
                    classString +=" killerBomb";

                }

                if(z==0)
                {
                    individualBombGroup.append("circle").attrs({
                        cx: x_Pos,
                        cy: y_Pos,
                        r: radiusOfCircle/2,
                        // r: 2,
                        "fill-opacity":glyphOPacity,
                        "fill":function(){
                            // return colors[1];
                            // return "black";
                            return "none";

                        },
                        "stroke-width":"1px",
                        "stroke":"black",
                        "opacity":0.9
                    });

                    individualBombGroup.append("line").attrs({
                        "x1": x_Pos + radiusOfCircle/2,
                        "y1": y_Pos,
                        "x2": xscale(bombsData[y]["endStep"] - window.flameDuration) - spaceBetweenTimesteps/2,
                        "y2": y_Pos,
                        "stroke": "black",
                        "opacity": glyphOPacity,
                        "stroke-width":"1px",
                        "stroke-dasharray": "2,2"


                    });
                }
                var spaceBetweenTimesteps = xscale(2) - xscale(1);
                var heightOfRectangle = radiusOfCircle;
                if(bombsData[y]["timeline"][z]["moved"])
                {
                    
                    individualBombGroup.append("rect").attrs({
                        x: x_Pos - spaceBetweenTimesteps,
                        y: y_Pos - heightOfRectangle/2,
                        rx: 0,
                        ry: 0,
                        width: spaceBetweenTimesteps,
                        height: heightOfRectangle,
                        "fill": colors[0],
                        "fill-opacity":glyphOPacity,
                        "class": " moved"
                    });
                    // individualBombGroup.attr("class", "bomb kicked moved");
                    classString += " kicked moved";
                }
                if(bombsData[y]["timeline"][z]["blast"])
                {
                    individualBombGroup.append("rect").attrs({
                        "x": x_Pos- spaceBetweenTimesteps/2 ,
                        "y": y_Pos - heightOfRectangle/2,
                        "width": (window.flameDuration+1)*spaceBetweenTimesteps,
                        "height": heightOfRectangle,
                        "stroke-opacity": glyphOPacity,
                        "fill":"grey",
                        "fill-opacity":glyphOPacity,
                        "stroke-width":"1",
                        "stroke":"black"
                    });
                    for(var l = 0; l<=window.flameDuration; l++)
                    {
                        x_Pos = xscale(bombsData[y]["timeline"][z]["step"] + l);
                        var lineWidth = radiusOfCircle/2;

                        // bombGroup.append("line").attrs({
                        //     "x1": x_Pos - lineWidth/2,
                        //     "y1": y_Pos - lineWidth/2,
                        //     "x2": x_Pos + lineWidth/2,
                        //     "y2": y_Pos + lineWidth/2,
                        //     "stroke-opacity": glyphOPacity,
                        //     "stroke-width":"1",
                        //     "stroke":"black"
                        // });
                        // bombGroup.append("line").attrs({
                        //     "x1": x_Pos - lineWidth/2,
                        //     "y1": y_Pos + lineWidth/2,
                        //     "x2": x_Pos + lineWidth/2,
                        //     "y2": y_Pos - lineWidth/2,
                        //     "stroke-opacity": glyphOPacity,
                        //     "stroke-width":"1",
                        //     "stroke":"black"
                        // });
                        // bombGroup.append("circle").attrs({
                        //     cx: x_Pos,
                        //     cy: y_Pos,
                        //     r: radiusOfCircle/2,
                        //     "fill-opacity":0,
                        //     "stroke-opacity": glyphOPacity,
                        //     "stroke-width":"1",
                        //     "stroke":"black"
                        //     // fill:function(){
                        //     //     return colors[0];
                        //     // }
                        // });
                    }

                    individualBombGroup.attr("class", classString);

                    
                }
            }
        }
    }
    
   

    // Draw Event vertical lines
    var edges = window._dataForVisualization["eventEdges"];
    var edgeGroup = svg.append("g");

    for(var x=0; x<edges.length; x++)
    {
        // if(edges[x]["type"] != "laidBomb")
        // if(edges[x]["source"] == "e3")
         {
            var y1 = yscale(edges[x]["source"]);
            var y2 = 0;

            var localX = -1;
            var localY = -1;
            var radiusOfCircleInpowerRow = 2; 
            
            if(!(edges[x]["target"] in window.Rowid_agentIndexDictionary) && edges[x]["type"] == "pickedPower")
            {
                localX = xscale(edges[x]["stepNumber"]);
                
                var heightOfPowerRow =  yscale("e8") - yscale("e7");
                var heightOfSubRow = heightOfPowerRow/4;
                var agentIndex = window.Rowid_agentIndexDictionary[edges[x]["source"]];
                var yLoc = yscale(edges[x]["target"]) - heightOfPowerRow/2 + heightOfSubRow/2;
                
                switch(agentIndex)
                {
                    case 0: yLoc += 0 ; break;
                    case 1: yLoc += 2*heightOfSubRow; break;
                    case 2: yLoc += 1*heightOfSubRow; break;
                    case 3: yLoc += 3*heightOfSubRow; break;

                }
                localY =  yLoc;
                      
                edgeGroup.append("circle").attrs({
                            cx: localX,
                            cy: localY,
                            r: radiusOfCircleInpowerRow,
                            "fill-opacity":glyphOPacity,
                            "class": "hyperNodes pickedPower",
                            fill:function(){
                                return "black";
                            }
                        });    
                // edgeGroup.append("circle").attrs({
                //     cx: localX,
                //     cy: localY,
                //     r: radiusOfCircleInpowerRow,
                //     "opacity":glyphOPacity,
                //     "stroke":"black",
                //     "stroke-width":"1px",
                    
                //     "fill":function(){
                //         return "none";
                //     }
                // });

                // edgeGroup.append("text").attrs({
                //     "x":  localX,
                //     "y": localY,
                //     "dominant-baseline":"central",
                //     "text-anchor":"middle",
                //     "font-size": 2*radiusOfCircleInpowerRow
                // }).text("5");
            }
            var killerKick = "";
            if(edges[x]["type"] == "kicked")
            {
                var kickedBombId = edges[x]["bombId"];
                if(window.allBombIdsResponsibleForDeath.indexOf(kickedBombId) >=0 )
                {
                    killerKick = " killerKick";
                }
                if( kickedBombId != undefined)
                {
                    y2 = window.bombLayoutDictionary[kickedBombId]["yPos"];
                }
                else
                {
                    console.log("cannot find kicked bomb's id");
                    // return 0;
                }
            }
            else if(edges[x]["type"] == "death")
            {
                var killingBombId = edges[x]["target"];
                if( killingBombId != undefined)
                {
                    y2 = window.bombLayoutDictionary[killingBombId]["yPos"];
                }
                else
                {
                    console.log("cannot find kicked bomb's id");
                    // return 0;
                }
            }
            else
                // y2 =  yscale(edges[x]["target"]);
                y2 =  localY;

            if(y1< y2)
            {
                y1 += radiusOfCircle;
                if(edges[x]["type"] == "pickedPower")
                    y2 -= radiusOfCircleInpowerRow;
            }
            else
            {
                y1 -= radiusOfCircle;
                if(edges[x]["type"] == "pickedPower")
                    y2 += radiusOfCircleInpowerRow;
            }

            
            edgeGroup.append("line")
                    .attrs({
                        "x1": xscale(edges[x]["stepNumber"]),
                        "y1": y1,
                        "x2": xscale(edges[x]["stepNumber"]),
                        // "y2": yscale(edges[x]["target"]),
                        "y2": y2,
                        "stroke":"black",
                        "opacity":glyphOPacity,
                        // "opacity": 0.5,
                        "stroke-width":"1px",
                        "class": "hyperEdges "+edges[x]["type"] +" edgeofplayer"+edges[x]["source"]+ " "+killerKick,
                        "visibility":function(){
                            if(edges[x]["type"] != "laidBomb")
                                return "visible";
                            else
                                return "hidden";
                        }
                    })
            // if(!(edges[x]["source"] in window.Rowid_agentIndexDictionary))
            // {
            //     edgeGroup.append("circle").attrs({
            //         cx: xscale(edges[x]["stepNumber"]),
            //         cy: yscale(edges[x]["source"]),
            //         r: radiusOfCircle/2,
            //         "fill-opacity":glyphOPacity,
            //         fill:function(){
            //             return "black";
            //         }
            //     });
            // }
            // if(!(edges[x]["target"] in window.Rowid_agentIndexDictionary) && edges[x]["type"] == "pickedPower")
            // {
            //     edgeGroup.append("circle").attrs({
            //         cx: xscale(edges[x]["stepNumber"]),
            //         cy: yscale(edges[x]["target"]),
            //         r: radiusOfSmallDots,
            //         "fill-opacity":glyphOPacity,
            //         fill:function(){
            //             return "black";
            //         }
            //     });
            // }
            
        }
    }


    // SVG dropdown code from https://bl.ocks.org/vbiamitr/f39f26dc93d95251912e817d6c266ed6
    // var svg = d3.select("svg");
    // var members = [{
    //     label: "# Moves",
    //     value: "moved"
    //   },
    //   {
    //     label: "# Bombs Laid",
    //     value: "laidBomb"
    //   },
    //   {
    //     label: "# Bomb Kicks",
    //     value: "kicked"
    //   },
    //   {
    //     label: "# Power Pickups",
    //     value: "pickedPower"
    //   },
    //   {
    //     label: "# Deaths",
    //     value: "death"
    //   }
    // ];
  
    // var config = {
    //   width: 120,
    //   container: svg,
    //   members,
    //   fontSize: 14,
    //   color: "#333",
    //   fontFamily: "calibri",
    //   x: width-100,
    //   y: topPadding,
    //   changeHandler: function(option) {
    //     // "this" refers to the option group
    //     // Change handler code goes here
    //     drawSumColumn(option.value,0);

    //   }
    // };
  
    // svgDropDown(config);

    drawSumColumn("pickedPower", 0);
    drawSumColumn("laidBomb", 1);
    drawSumColumn("kicked", 2);
    drawSumColumn("moved", 3);
    // drawSumColumn("death", 4);
    // svg.append("text").text("Sum #").attrs({
    //     x: width-50,
    //     y: topPadding ,
    //     "text-anchor":"middle",
    //     "dominant-baseline": "middle"
    // });
    
    // Draw SumColumn
    function drawSumColumn(eventName, index)
    {
        var widthOfColumn = 30;
        // var endPosOfVis = height-bottomPadding;
        var endPosOfVis = yscale(entities2[entities2.length -1]) + heightOfRow/2;
        window.endyPosOfMatrix = endPosOfVis;
        // var heightOfVis =  yscale(entities2[entities2.length -1]) - yscale(entities2[0]) ;
        var heightOfVis =  heightOfRow * entities2.length - heightOfRow/4;
        var x_Pos = width - rightPadding  + (index +1)*widthOfColumn +5;
        
        // d3.selectAll(".sumEvent").remove();
        var labelAtTop = "";
        // switch(eventName)
        // {
        //     case "moved": labelAtTop = "# Moves"; break;
        //     case "laidBomb": labelAtTop = "# Bombs Laid"; break;
        //     case "kicked": labelAtTop = "# Bomb Kicks"; break;
        //     case "pickedPower": labelAtTop = "# Power Ups"; break;
        //     case "death": labelAtTop = "# Deaths"; break;
        // }
        labelAtTop = window.metric_labelDictionary[eventName];
        var y_Pos = yscale("e1") - 12;

        
        var lastYPos = yscale(entities2[entities2.length -1]) - heightOfRow;
        svg.append("line")
        .attrs({
            "x1": x_Pos - widthOfColumn/2,
            "y1": y_Pos,
            "x2": x_Pos - widthOfColumn/2,
            "y2": endPosOfVis,
            "stroke":"grey",
            "opacity": 0.5,
            "stroke-width":"1px"
        })

        var sx = x_Pos - widthOfColumn/2;
        var widthOfLabel = 100;
        svg.append("line")
        .attrs({
            "x1": sx ,
            "y1": y_Pos,
            "x2": x_Pos + widthOfLabel - 17,
            "y2": y_Pos,
            "stroke":"lightgray",
            "opacity": 0.5,
            "stroke-width":"1px",
            "transform":"rotate(230,"+sx+","+y_Pos+")"
        })

        if(index%2 ==0)
        {
            svg.append("rect")
            .attrs({
                "x": x_Pos - widthOfColumn/2,
                "y": y_Pos,
                "width":  widthOfColumn,
                "height": heightOfVis,
                "fill":"lightgray",
                "fill-opacity": 0.2,
                "stroke-width":"1px"
            });
            svg.append("rect")
            .attrs({
                "x": sx ,
                "y": y_Pos,
                "width":  widthOfLabel,
                "height": widthOfColumn - 7,
                "fill":"lightgray",
                "fill-opacity": 0.2,
                "stroke-width":"1px",
                "transform":" rotate(230,"+(sx)+","+(y_Pos)+") skewX(-40) translate("+(widthOfLabel/2 + 17)+",0)"
                // "transform":"translate(0, "+lastYPos+") rotate(-225,"+(sx)+","+(y_Pos)+") skewX(45) translate("+(-widthOfLabel + 10)+",-20)"
            });
        }
        svg.append("text").attrs({
            "x": x_Pos,
            "y": y_Pos,
            "transform":"rotate(50,"+x_Pos+","+y_Pos+")",
            // "transform":"translate(0, "+lastYPos+") rotate(-45,"+x_Pos+","+y_Pos+") ",
            "dominant-baseline":"middle",
            "text-anchor": "end"
            // "font-size":"11px"
        }).text(labelAtTop);

        if(index ==3)
        {
            svg.append("line")
            .attrs({
                "x1": x_Pos + widthOfColumn/2,
                "y1": y_Pos,
                "x2": x_Pos + widthOfColumn/2,
                "y2": endPosOfVis,
                "stroke":"grey",
                "opacity": 0.5,
                "stroke-width":"1px"
            })

            var sx = x_Pos + widthOfColumn/2;
            var widthOfLabel = 110;
            svg.append("line")
            .attrs({
                "x1": sx ,
                "y1": y_Pos,
                "x2": x_Pos + widthOfLabel,
                "y2": y_Pos,
                "stroke":"lightgray",
                "opacity": 0.5,
                "stroke-width":"1px",
                "transform":"rotate(230,"+sx+","+y_Pos+")"
            })
        }

        

        for(var entityId in window._dataForVisualization.eventSumDictionary)
        {
            
            var y_Pos = yscale(entityId);

            svg.append("text").text(function(){
                return window._dataForVisualization.eventSumDictionary[entityId][eventName];
            }).attrs({
                x: x_Pos,
                y: y_Pos +heightOfRow/2,
                "text-anchor":"middle",
                "dominant-baseline": "middle",
                "class":"sumEvent"
            });
        }
    }

    var metric = window.selectedMetric;
    var tempdatae1 = calcEventDensityData(metric, "e1", 10);
    var tempdatae2 = calcEventDensityData(metric, "e2", 10);

    var team1Data = sumData( tempdatae1, tempdatae2);
    
    


    var tempdatae3 = calcEventDensityData(metric, "e3", 10);
    var tempdatae4 = calcEventDensityData(metric, "e4", 10);

    var team2Data = sumData( tempdatae3, tempdatae4);

    var maximumNumberOfEventsInBin = d3.max([ d3.max(team1Data) , d3.max(team2Data) ]);
    window.histogramYScale = d3.scaleLinear().domain([0, maximumNumberOfEventsInBin]).range([0, window.maxHeightOfHistogramBars]);
    
    drawEventHistogram(metric, "team1", 10, team1Data, 1);
    drawEventHistogram(metric, "team2", 10, team2Data, 2);

    var statusBar = svg.append("g").attr("id", "status");
    var widthOfstatusBarRectangle = 35, heightOfStatusBarRect = 8;
    var yBeginLocationOfStatusBar = topPadding - 4;

    var drag = d3.drag()
            // .subject(function (d) { return d; })
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        // d3.select(this).classed("dragging", true);
        // console.log(d3.event.x);
    }
    
    function dragged(d) {
        // d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
        var t = d3.select('#status').node().transform.baseVal[0].matrix;
        var currentX = t["e"];
        var xPosOnDrag = d3.event.sourceEvent.offsetX* (1/window.zoomFactor);
        var visEndX = globalXScale(window.pommermanData["blob"]["state"].length) ;
        var visStartX = globalXScale(0);
        if(xPosOnDrag >= visStartX && xPosOnDrag<=visEndX)
        {
            d3.select("#status").attr("transform","translate("+( xPosOnDrag )+",0)" );
            var alpha = (visEndX - visStartX)/window.pommermanData["blob"]["state"].length;
            var sliderValue = Math.floor((xPosOnDrag - visStartX)/alpha);
            d3.select("#frame").text(sliderValue+1);
            $( "#slider" ).slider({
                value: sliderValue
            });
            var stateArray = window.pommermanData["blob"]["state"];
            
            
            var video = d3.select("#videoSVG");
            
            renderFrame(stateArray, sliderValue, video);

            // console.log(d3.event.x, xPosOnDrag, visStartX);
        }
        // console.log(d3.event.x, d3.event.sourceEvent.offsetX);
        
    }

    function dragended(d) {
        // d3.select(this).classed("dragging", false);
        // console.log(d3.event.x);

    }

    statusBar.append("rect")
    .attrs({
        "x": 0-widthOfstatusBarRectangle/2,
        "y": yBeginLocationOfStatusBar,
        "rx":2,
        "ry":2,
        "width": widthOfstatusBarRectangle,
        "height":heightOfStatusBarRect,
        "stroke":"red",
        "fill":"#ff7f7f",
        "stroke-width":"2px",
        "opacity":1,
        "cursor": "pointer"
        // "style":"opacity:0;"
    });
    // statusBar.append("text").attrs({
    //     "x": textEnd,
    //     "y": topPadding + heightOfStatusBarRect/2,
    //     "id":"statusBarText",
    //     "dominant-baseline":"central",
    //     "text-anchor":"middle",
    //     "font-size":heightOfStatusBarRect-2
    // }).text(1);

    statusBar.append("rect")
    .attrs({
        "x": 0,
        "y": yBeginLocationOfStatusBar+heightOfStatusBarRect,
        "width": 1.5,
        "height":window.statusHeight,
        "stroke":"none",
        "fill":"red",
        "id":"statusBarVerticalLine"
        // "stroke-width":"1px"
        // "style":"opacity:0;"
    })
    
    statusBar.call(drag);

    statusBar.attr("transform", "translate("+ xscale(0) +",0)");


    

    

   


    preparePlayback();
    highlightEventsFunc();

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


    // var maximumDuration = 297*1000;

    // var maximumNumberOfEventsInBin = 0;
    // var allDensityDataArray = [];

    // var localxScale = d3.scaleLinear().domain([0, maximumDuration]).range([0, eachColumn]);
    // xPosition = textEnd;

    // window.tableLocations = {};
    // window.durationDict = {};
    // for(var participant in eventData2)
    // {
    //     for(var phase in eventData2[participant])
    //     {
    //         counter +=1;
    //         eventData = eventData2[participant][phase]["data"]
    //         start = eventData2[participant][phase]["start"]
    //         end = eventData2[participant][phase]["end"]
    //         duration = eventData2[participant][phase]["duration"]

    //         durationDict[counter] = {};
    //         durationDict[counter]["start"] = start;
    //         durationDict[counter]["end"] = end;
    //         durationDict[counter]["duration"] = duration;


    //         var minTimestamp = eventData2[participant][phase]["start"];
    //         var maxTimestamp = eventData2[participant][phase]["end"];
    //         var localDuration = maxTimestamp - minTimestamp;
    //         // var xscale = d3.scaleLinear().domain([minTimestamp, maxTimestamp]).range([textEnd + (counter-1)*eachColumn + paddingBetweenColumns, (counter)*eachColumn]);
    //         if(counter%2 ==1)
    //             paddingBetweenColumns = 0;
    //         else
    //             paddingBetweenColumns = 0;

    //         xstart = xPosition;
    //         tableLocations[counter] = {"start": xstart};
    //         xend = xstart + localxScale(localDuration);
    //         temp = (eachColumn- (xend - xstart))/2;
    //         var padStartLeft = 0;

    //         // console.log("counter: ",counter,", ", xstart,", " ,xend, ", ",localDuration, ", maxDuration:",maximumDuration);
    //         var xscale = d3.scaleLinear().domain([minTimestamp, maxTimestamp]).range([padStartLeft+xstart, padStartLeft + xend]);
            
            

    //         var dataPlot = svg.append("g");
            
    //         var binForDensity = 6000;
    //         var eventDensityData = [];
    //         var currentTimestep = -1;
    //         var previousTimestep = -1;
            
    //         var tempdict = { "events": JSON.parse(JSON.stringify(eventTypesDict)) };
    //         for(var event in tempdict["events"])
    //             tempdict["events"][event] = 0;

    //         var tempDictPerBin = {};
    //         // if(counter ==5)
    //         //     console.log(eventData[0]["start"], (eventData[eventData.length -1]["start"]+ binForDensity));

    //         for(var j=eventData[0]["start"]; j<= (eventData[eventData.length -1]["start"]+ binForDensity); j=j+binForDensity)
    //         {
    //             tempDictPerBin = JSON.parse(JSON.stringify(tempdict));
    //             tempDictPerBin["start"] = j;
    //             tempDictPerBin["end"] = j + binForDensity;
    //             tempDictPerBin["duration"] = binForDensity;
    //             tempDictPerBin = countEventsInBin(j, j+binForDensity, binForDensity, eventData, tempDictPerBin );
    //             var sum = 0;
    //             for(var eve in tempDictPerBin["events"])
    //             {
    //                 sum += tempDictPerBin["events"][eve];
    //             }
    //             tempDictPerBin["sum"] = sum;
    //             if(sum > maximumNumberOfEventsInBin)
    //                     maximumNumberOfEventsInBin = sum;


    //             eventDensityData.push(tempDictPerBin);
    //             // for(var eve in tempDictPerBin["events"])
    //             // {
    //             //     if(tempDictPerBin["events"][eve] > maximumNumberOfEventsInBin)
    //             //         maximumNumberOfEventsInBin = tempDictPerBin["events"][eve];
    //             // }
               
    //         }
    //         // console.log(eventData);
    //         // console.log(eventDensityData);
    //         allDensityDataArray.push(eventDensityData);

    //         for(var i=0; i<eventData.length; i++)
    //         {
    //             var objects = eventData[i]["entities"];
    //             if(objects.length == 2)
    //             {
    //                 // if(eventData[i]["condition"] == "INSTRUCTION_BY_CONTROLLER")
    //                 //     temp = "Controller (left)";
    //                 // else
    //                     temp = objects[0];
    //                 var dy1 = yscale(temp);
    //                 var dy2 = yscale(objects[1]);

    //                 if(dy1>dy2)
    //                 {
    //                     dy1 = dy1-radiusOfCircle;
    //                     dy2 = dy2 + radiusOfCircle;
    //                 }
    //                 else
    //                 {
    //                     dy1 = dy1+ radiusOfCircle;
    //                     dy2 = dy2 - radiusOfCircle;
    //                 }
    //                 for(var j=0; j<objects.length; j++)
    //                 {
    //                     dataPlot.append("circle")
    //                         .attrs({
    //                             cx: function(){ return xscale(eventData[i]["start"]); },
    //                             cy: function(){ 
    //                                     temp = objects[j];
    //                                 if(j==0)
    //                                     return yscale(temp); 
    //                                 else
    //                                     return yscale(objects[j]);
    //                             },
    //                             r: radiusOfCircle,
    //                             "fill-opacity":glyphOPacity,
    //                             fill:function(){

    //                                 var index = eventNameArray.indexOf(eventData[i]["type"]);
    //                                 return colors[index];
    //                             }
    //                         }).append("svg:title").text(function(){
    //                             return eventData[i]["type"];
    //                         })
                        
    //                 }
    //                 dataPlot.append("line")
    //                     .attrs({
    //                         x1: function(){ return xscale(eventData[i]["start"]); },
    //                         x2: function(){ return xscale(eventData[i]["start"]); },
    //                         y1: dy1,
    //                         y2: dy2,
    //                         "stroke-width": "1px",
    //                         "stroke":"black",
    //                         "opacity":glyphOPacity
    //                     })
    //             }

    //             else if(eventData[i]["type"] == "MovementAction")
    //             {
    //                 dataPlot.append("rect")
    //                             .attrs({
    //                                 "x":function(){ return xscale(eventData[i]["start"]) ; },
    //                                 "y": function(){return yscale(objects[0])- heightOfRow/2 },
    //                                 "width": function(){
    //                                     x1 = xscale(eventData[i]["start"]);
    //                                     x2 = xscale(eventData[i]["end"])
    //                                     return Math.abs(x2-x1);
    //                                 },
    //                                 "height": function(){
    //                                     return heightOfRow;
    //                                     //  yscale.bandwidth()
    //                                 },
    //                                 "fill-opacity":glyphOPacity,

    //                                 "fill":function(){
    //                                             var index = eventNameArray.indexOf(eventData[i]["type"]);
    //                                             return colors[index];
    //                                         }
    //                             }).append("svg:title").text(function(){
    //                                 return eventData[i]["type"];
    //                             })
    //             }

    //             else
    //             {
    //                 for(var j=0; j<objects.length; j++)
    //                 {
    //                     dataPlot.append("circle")
    //                         .attrs({
    //                             cx: function(){ return xscale(eventData[i]["start"]); },
    //                             cy: function(){ 
    //                                     temp = objects[j];
    //                                 if(j==0)
    //                                     return yscale(temp); 
    //                                 else
    //                                     return yscale(objects[j]);
    //                             },
    //                             r: radiusOfCircle,
    //                             "fill-opacity":glyphOPacity,
    //                             fill:function(){

    //                                 var index = eventNameArray.indexOf(eventData[i]["type"]);
    //                                 return colors[index];
    //                             }
    //                         }).append("svg:title").text(function(){
    //                             return eventData[i]["type"];
    //                         })
                        
    //                 }
    //             }
                
                
    //         }
    //         if(counter==1)
    //         { 
    //             dataPlot.append("line")
    //                 .attrs({
    //                     "x1": xPosition,
    //                     "y1":topPadding - 2*tableTop,
    //                     "x2":  xPosition,
    //                     "y2": lastRowBottomEdgeYLoacation,
    //                     "stroke":"black",
    //                     // "stroke-dasharray":"5 5",
    //                     "stroke-width":"1px"
    //                 });
    //         }
            
            
    //         xPosition = xend + radiusOfCircle;
    //         tableLocations[counter]["end"] = xPosition;

    //         if(counter%2==1)
    //         { 
    //             dataPlot.append("line")
    //                 .attrs({
    //                     "x1": xPosition,
    //                     "y1":topPadding - tableTop,
    //                     "x2":  xPosition,
    //                     "y2": lastRowBottomEdgeYLoacation,
    //                     "stroke":"black",
    //                     // "stroke-dasharray":"5 5",
    //                     "stroke-width":"1px"
    //                 });
    //         }
    //         else
    //         {
    //             dataPlot.append("line")
    //                 .attrs({
    //                     "x1": xPosition,
    //                     "y1":(topPadding-2*tableTop),
    //                     "x2":  xPosition,
    //                     "y2": lastRowBottomEdgeYLoacation,
    //                     "stroke":"black",
    //                     // "stroke-dasharray":"5 5",
    //                     "stroke-width":"1px"
    //                 });
    //             var paddingBetweenParticipants = 40;
                    
    //             dataPlot.append("rect")
    //                 .attrs({
    //                     "x": xPosition+1,
    //                     "y":(topPadding- 2*tableTop)-2,
    //                     "width":  function(){
    //                         if(counter != 6)
    //                             return paddingBetweenParticipants-2;
    //                         else
    //                             return width - xPosition;
    //                     },
    //                     "height": lastRowBottomEdgeYLoacation,
    //                     "stroke":"none",
    //                     // "stroke-dasharray":"5 5",
    //                     "fill":"white"
    //                 });
    //             if(counter<5)
    //             { 
    //             xPosition += paddingBetweenParticipants;
    //             dataPlot.append("line")
    //                 .attrs({
    //                     "x1": xPosition,
    //                     "y1":(topPadding- 2*tableTop),
    //                     "x2":  xPosition,
    //                     "y2": lastRowBottomEdgeYLoacation,
    //                     "stroke":"black",
    //                     // "stroke-dasharray":"5 5",
    //                     "stroke-width":"1px"
    //                 });
    //            }
    //         }
    //     }
        


    // }
    // // console.log(tableLocations);
    // for(var coun in tableLocations)
    // {
    //     var tempstart = tableLocations[coun]["start"];
    //     var tempend = tableLocations[coun]["end"];
    //     svg.append("text").attrs({
    //         x: tempstart + (tempend-tempstart)/2 ,
    //         y: (topPadding-tableTop/2),
    //         "dominant-baseline":"middle",
    //         "text-anchor":"middle"
    //     }).text(function(){
    //         if(parseInt(coun) %2 ==1 )
    //             return "Scene 1";
    //         else
    //             return "Scene 2";
    //     });
    //     coun = parseInt(coun);
    //     if(coun %2 ==0 )
    //     {
    //         tempx = tableLocations[coun -1]["start"] + (tableLocations[coun]["end"] - tableLocations[coun -1]["start"])/2;
    //         svg.append("text").attrs({
    //             x: tempx,
    //             y: (topPadding-2*tableTop + tableTop/2),
    //             "dominant-baseline":"middle",
    //             "text-anchor":"middle"
    //         }).text(function(){
    //             return "Session "+coun/2 +" with participants P"+ (coun-1)+" and P"+ (coun);
    //         });
    //     }
        
    // }
    // var maxHeightOfHistogramBars = 50;

    // for(var coun in tableLocations)
    // {
    //     var tempstart = tableLocations[coun]["start"];
    //     var tempend = tableLocations[coun]["end"];
    //     svg.append("text")
    //         .attrs({
    //             "x": tempstart + (tempend - tempstart)/2,
    //             "y": (height - bottomPadding + maxHeightOfHistogramBars - 20),
    //             "text-anchor":"middle"
    //         }).text( durationDict[coun]["duration"]  + " seconds");
    // }
    // svg.append("text")
    //     .attrs({
    //         "x": textEnd - marginTextBeforeMatrix,
    //         "y": (height - bottomPadding + maxHeightOfHistogramBars - 20),
    //         "text-anchor":"end"
    //     }).text("Length of Scene:");


    
    // for(var i=0; i< allDensityDataArray.length; i++)
    // {
    //     var histogram = svg.append("g");

    //     var histogramXScale = d3.scaleLinear()
    //                         .domain([ allDensityDataArray[i][0]["start"], allDensityDataArray[i][allDensityDataArray[i].length -1]["start"]  ])
    //                         .range([tableLocations[i+1]["start"], tableLocations[i+1]["end"]] );
    //     var histogramYScale = d3.scaleLinear().domain([0, maximumNumberOfEventsInBin]).range([0, maxHeightOfHistogramBars]);
        
    //     var widthOfOneBar = histogramXScale(allDensityDataArray[i][1]["start"]) - histogramXScale(allDensityDataArray[i][0]["start"]);

    


    //     for(var j=0; j<allDensityDataArray[i].length; j++)
    //     {
    //         var d = allDensityDataArray[i][j];
    //         var bar = histogram.append("rect")
    //                     .attrs({
    //                         "x": histogramXScale(d["start"]),
    //                         "y": 0 - histogramYScale(d["sum"]),
    //                         "width":widthOfOneBar,
    //                         "height": histogramYScale(d["sum"]),
    //                         "fill":"gray"
    //                     })
    //         bar.append("svg:title").text(function(){
    //                         return "# events: "+d["sum"];
    //                     });
    //         // console.log(height - bottomPadding + maxHeightOfHistogramBars);
    //     }
    //     histogram.attr("style", "transform: translate(0px,"+(height - bottomPadding + 2*maxHeightOfHistogramBars) + "px);");
        
    // }
    // svg.append("text")
    //     .attrs({
    //         "x": textEnd - marginTextBeforeMatrix,
    //         "y": (height - bottomPadding + 2*maxHeightOfHistogramBars - 15),
    //         "text-anchor":"end"
    //     }).text("Event Histogram:");

    // svg.append("text")
    //     .attrs({
    //         "x": textEnd - marginTextBeforeMatrix,
    //         "y": (height - bottomPadding + 2*maxHeightOfHistogramBars),
    //         "text-anchor":"end"
    //     }).text("(bin size: "+ (binForDensity/1000)+" seconds)");
    
    // var heightOfWaveform = 50;

    // svg.append("text")
    //     .attrs({
    //         "x": textEnd - marginTextBeforeMatrix,
    //         "y": (height - bottomPadding + 3*maxHeightOfHistogramBars + heightOfWaveform/2 + 5),
    //         "text-anchor":"end"
    //     }).text("Recorded Conversation:");
    
    // imageFilenameArray = ["p1train.PNG", "p1test.PNG", "p5train.PNG", "p5test.PNG", "p11train.PNG", "p11test.PNG"];
    // elementIdArray = ["p1Train", "p1Test", "p5Train", "p5Test", "p11Train", "p11Test"];
    

    

    

    // for(var i=0; i< allDensityDataArray.length; i++)
    // // for(var i=0; i< 4; i++)
    // {
    //     svg.append("image")
    //         .attrs({
    //             "xlink:href": "images/"+imageFilenameArray[i],
    //             "x": tableLocations[i+1]["start"],
    //             "y": (height - bottomPadding + 3*maxHeightOfHistogramBars),
    //             "width": (tableLocations[i+1]["end"] - tableLocations[i+1]["start"]),
    //             "height": heightOfWaveform 
    //         });
        
    //     svg.append("image")
    //         .attrs({
    //             "xlink:href": "images/play.png",
    //             "x": tableLocations[i+1]["start"] + (tableLocations[i+1]["end"] - tableLocations[i+1]["start"])/2 ,
    //             "y":(height - bottomPadding + 3*maxHeightOfHistogramBars + heightOfWaveform + 5),
    //             "width": "30px",
    //             "height": "30px",
    //             "elementID": elementIdArray[i],
    //             "index": (i+1)

    //         }).on("click", function(){
    //                 var index = d3.select(this).attr("index");
    //                 window.videoIndexBeingPlayed = index;
    //                 // d3.select("#videoSource").attr("src", videoFiles[index-1]);

    //                 document.getElementById("video1").src = videoFiles[index-1];
    //                 document.getElementById("video1").load();

    //                 var myVideo = document.getElementById("video1");
    //                 playPause("video1");
    //                 // d3.select("#status").style("opacity", 1);
                    
    //                 // var sbar = d3.select("#status");
    //                 // var currentX = sbar.attr("x");
    //                 // if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
    //                 // {
    //                 //     var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
    //                 //     var dur = (currentX - tableLocations[index]["start"])/alpha;

    //                 //     d3.select("#status").attr("x", currentX)
    //                 //     .transition().duration((durationDict[index]["duration"] - dur)*1000)
    //                 //     .ease(d3.easeLinear)
    //                 //     .attr("x", tableLocations[index]["end"]);
    //                 // }
    //                 // else
    //                 {

                    
    //                 d3.select("#status").attr("x", tableLocations[index]["start"])
    //                     .transition().duration(durationDict[index]["duration"]*1000)
    //                     .ease(d3.easeLinear)
    //                     .attr("x", tableLocations[index]["end"]);
    //                 // document.getElementById(d3.select(this).attr("elementID")).play();
    //                 }
    //             }).append("svg:title").text("Play from start of this scene.");

    //     // svg.append("image")
    //     //     .attrs({
    //     //         "xlink:href": "images/playpause.png",
    //     //         "x": tableLocations[i+1]["start"] + (tableLocations[i+1]["end"] - tableLocations[i+1]["start"])/2 + 5,
    //     //         "y":(height - bottomPadding + 3*maxHeightOfHistogramBars + heightOfWaveform + 5),
    //     //         "width": "30px",
    //     //         "height": "30px",
    //     //         "elementID": elementIdArray[i],
    //     //         "index": (i+1)

    //     //     }).on("click", function(){
    //     //             var index = d3.select(this).attr("index");
    //     //             var myVideo = document.getElementById("video1");
    //     //             // playPause("video1");
    //     //             if (myVideo.paused) 
    //     //             {
    //     //                 var sbar = d3.select("#status");
    //     //                 var currentX = sbar.attr("x");
    //     //                 if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
    //     //                 {
    //     //                     var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
    //     //                     var dur = (currentX - tableLocations[index]["start"])/alpha;

    //     //                     d3.select("#status").attr("x", currentX)
    //     //                     .transition().duration((durationDict[index]["duration"] - dur)*1000)
    //     //                     .ease(d3.easeLinear)
    //     //                     .attr("x", tableLocations[index]["end"]);
    //     //                 }
    //     //                 else
    //     //                 {

                        
    //     //                 d3.select("#status").attr("x", tableLocations[index]["start"])
    //     //                     .transition().duration(durationDict[index]["duration"]*1000)
    //     //                     .ease(d3.easeLinear)
    //     //                     .attr("x", tableLocations[index]["end"]);
    //     //                 // document.getElementById(d3.select(this).attr("elementID")).play();
    //     //                 }
    //     //                 myVideo.play();
    //     //             }
    //     //             else
    //     //             {
    //     //                 myVideo.pause();
    //     //                 d3.select("#status").interrupt();

    //     //             }
    //     //             // document.getElementById(d3.select(this).attr("elementID")).pause();

    //     //         }).append("svg:title").text("Play/Pause");
    //     }

    //     var statusBar = svg.append("rect")
    //         .attrs({
    //             "id": "status",
    //             "x": textEnd,
    //             "y": topPadding,
    //             "width": "1px",
    //             "height": height + bottomPadding + maxHeightOfHistogramBars,
    //             "stroke":"none",
    //             "fill":"red",
    //             "stroke-width":"1px"
    //             // "style":"opacity:0;"
    //         })

        
    //     var vid = document.getElementById("video1");
    //     vid.onpause = function() {
    //         d3.select("#status").interrupt();
    //     };
    //     vid.onplay = function() {
    //         seeking1();
    //         var index = window.videoIndexBeingPlayed ;
    //         var sbar = d3.select("#status");
    //         var currentX = sbar.attr("x");
    //         // if(sbar.attr("x") >= tableLocations[index]["start"] && sbar.attr("x") <= tableLocations[index]["end"])
    //         {
    //             var alpha = ((tableLocations[index]["end"] - tableLocations[index]["start"])/durationDict[index]["duration"]);
    //             var dur = (currentX - tableLocations[index]["start"])/alpha;

    //             d3.select("#status").attr("x", currentX)
    //             .transition().duration((durationDict[index]["duration"] - dur)*1000)
    //             .ease(d3.easeLinear)
    //             .attr("x", tableLocations[index]["end"]);
    //         }
    //     };
            
    //         // .attr("x2", tableLocations[1]["end"]);

    // // svg.append("text")
    // //     .attrs({
    // //         "x": tableLocations[1]["start"] + (tableLocations[1]["end"] - tableLocations[1]["start"])/2,
    // //         "y": (height - bottomPadding + 2*maxHeightOfHistogramBars + heightOfWaveform + 5),
    // //         "text-anchor":"middle"
    // //     }).text("Play")
    // //     .on("click", function(){
    // //         document.getElementById('p1Train').play();
    // //     })
    // // svg.append("image")
    // //     .attrs({
    // //         "xlink:href": "realStudy/p1/p1_test_final.PNG",
    // //         "x": tableLocations[2]["start"],
    // //         "y": (height - bottomPadding + 2*maxHeightOfHistogramBars),
    // //         "width": (tableLocations[2]["end"] - tableLocations[2]["start"]),
    // //         "height": heightOfWaveform
    // //     });
    // // svg.append("image")
    // //     .attrs({
    // //         "xlink:href": "images/play.png",
    // //         "x": tableLocations[2]["start"] + (tableLocations[2]["end"] - tableLocations[2]["start"])/2 - 35,
    // //         "y":(height - bottomPadding + 2*maxHeightOfHistogramBars + heightOfWaveform + 5),
    // //         "width": "30px",
    // //         "height": "30px"
    // //     }).on("click", function(){
                
    // //             document.getElementById('p1Test').play();
    // //         });
    // // svg.append("image")
    // //     .attrs({
    // //         "xlink:href": "images/pause2.png",
    // //         "x": tableLocations[2]["start"] + (tableLocations[2]["end"] - tableLocations[2]["start"])/2 + 5,
    // //         "y":(height - bottomPadding + 2*maxHeightOfHistogramBars + heightOfWaveform + 5),
    // //         "width": "30px",
    // //         "height": "30px"
    // //     }).on("click", function(){
    // //             document.getElementById('p1Test').pause();
    // //         });
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


