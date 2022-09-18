function csRankings()
{
    var groupConferences = true;
    const authornumPublicationsThresholdOverAllTimesteps = 30;
    const timestepBinSize = 3; //Number of years in a bin/timestep
    const maxNumOfTimesteps = 10;
    var timestep_yearsarray_dict={};
    var csrankingsArray =  window.csRankingsJSON;
    // console.log(csrankingsJSON);
    var conferenceNamesSet= new Set();
    var areaNamesSet = new Set();
    var yearsSet = new Set();
    var areaNamesDict={};
    for(var ob of csrankingsArray)
    {
        if(!(conferenceNamesSet.has(ob.conf)))
            conferenceNamesSet.add(ob.conf)
        if(!(areaNamesSet.has(ob.area)))
         {
               areaNamesSet.add(ob.area);
               areaNamesDict[ob.area] = {"count":0,"papers":[]};
         }
         if(!(yearsSet.has(ob.year)))
            yearsSet.add(ob.year)
    }
    // console.log(conferenceNamesSet, areaNamesSet);
    var yearsArray = [];
    yearsSet.forEach(function(key, value, set){
        // console.log(key, value, set);
        yearsArray.push(key);
    });
    yearsArray.sort();
    yearsArray.reverse();
    var isYearExceeded = false;
    for(var i=0; i<maxNumOfTimesteps; i++)
    {
        if(!(isYearExceeded))
        {
            var binYearsArray = [];
            for(var j=0; j<timestepBinSize;j++)
            {
                if(!(isYearExceeded))
                { 
                    var tindex = (timestepBinSize*i)+j;
                    if(tindex >= (yearsArray.length-1))
                    {
                        tindex = yearsArray.length-1;
                        isYearExceeded = true;
                    }
                    binYearsArray.push(yearsArray[tindex]);
                }
            }
            timestep_yearsarray_dict[maxNumOfTimesteps-i] = binYearsArray;
        }
    }
    // console.log(timestep_yearsarray_dict);
    var year_timestepnum_dict={};
    for(var t in timestep_yearsarray_dict)
    {
        for(var y of timestep_yearsarray_dict[t])
            year_timestepnum_dict[y] = t;
    }
    // console.log(year_timestepnum_dict);
    window.year_author_area_dict = {};
    for(var ob of csrankingsArray)
    {
        if(ob.year in year_timestepnum_dict)
        {
            //year does not exist
            if(!(year_timestepnum_dict[ob.year] in year_author_area_dict))
            {
                year_author_area_dict[year_timestepnum_dict[ob.year]] = {};
                year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name] = JSON.parse(JSON.stringify(areaNamesDict));
                year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name][ob.area].count++;
                year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name][ob.area].papers.push(ob);
            }
            // year exists
            else
            {
                //author does not exist
                if(!(ob.name in year_author_area_dict[year_timestepnum_dict[ob.year]]))
                {
                    year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name] = JSON.parse(JSON.stringify(areaNamesDict));
                    year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name][ob.area].count++;
                    year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name][ob.area].papers.push(ob);

                }
                // author exists
                else
                {
                    year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name][ob.area].count++;
                    year_author_area_dict[year_timestepnum_dict[ob.year]][ob.name][ob.area].papers.push(ob);
                }
            }
        }
    }

    var domain_conf_dict ={
        "AI/ML": ["ijcai","aaai","icml","nips","kdd"],
        // "Computer Vision": ["cvpr","eccv","iccv"],
        // "NLP": ["acl","emnlp", "naacl"],
        // "The Web":[],
        // "Computer Architecture":["asplos", "isca", "micro","hpca"],
        // "Computer Networks":[],
        // "Operating Systems":["osdi","sosp","eurosys","fast","usenixatc"],
        // "Software Engineering":["fse","icse","ase","issta"],
        // "Algorithms":["focs", "soda", "stoc"],
        "Robotics":["icra","iros","rss"],
        "Graphics/Vis./HCI":["vis","vr","siggraph","siggraph-asia","chi","uist","ubicomp"]
    }

    // console.log(year_author_area_dict);

    var conf_domain_dict = {};
    var selectedConferences = ["vis","vr","siggraph","siggraph-asia","chi","uist","ubicomp"];
    if(groupConferences)
    {
        for(var domain in domain_conf_dict)
        {
            for(var conf of domain_conf_dict[domain])
            {
                conf_domain_dict[conf] = domain;
            }
        }
    }
    else{
        for(var conf of selectedConferences)
            conf_domain_dict[conf] = conf;
    }

    var filteredDataOfConferences = {};

    for(var year in year_author_area_dict)
    {
       
        for(var author in year_author_area_dict[year])
        {

            for(var area in year_author_area_dict[year][author])
            {
                if(area in conf_domain_dict)
                {
                    if(!(year in filteredDataOfConferences))
                    {
                        filteredDataOfConferences[year] = {};
                    }
                    if(!(author in filteredDataOfConferences[year]))
                    {
                        filteredDataOfConferences[year][author] = {};
                    }

                    if(!(conf_domain_dict[area] in filteredDataOfConferences[year][author]))
                    {
                        filteredDataOfConferences[year][author][conf_domain_dict[area]] = {"count":0, "papers":[]};
                    }
                    
                    
                    filteredDataOfConferences[year][author][conf_domain_dict[area]].count += year_author_area_dict[year][author][area].count;
                    filteredDataOfConferences[year][author][conf_domain_dict[area]].papers = filteredDataOfConferences[year][author][conf_domain_dict[area]].papers.concat(year_author_area_dict[year][author][area].papers);

                    
                }
            }
        }
    }
    // console.log(filteredDataOfConferences);
    var author_numPublications_dict={};
    
    for(var year in filteredDataOfConferences)
    {
        for(var author in filteredDataOfConferences[year])
        {
            if(!(author in author_numPublications_dict))
                author_numPublications_dict[author] = 0;

            for(var area in filteredDataOfConferences[year][author])
            {
                author_numPublications_dict[author] += filteredDataOfConferences[year][author][area].count;
            }
        }
    }

    //code to limit the number of authors for sampled data
    sampleDataAuthorDict = {'Yoshua Bengio':true, 'David R. Karger': true, 'Sergey Levine': true, 'Masayuki Inaba': true, 'Graham Neubig':true, 'Wolfram Burgard': true, 'Gerd Hirzinger': true, 'Dinesh Manocha': true, 'Hanspeter Pfister': true, 'Hans-Peter Seidel':true, 'James M. Rehg': true
, 'Jun Zhu 0001': true, 'Peter Wonka':true};
    for(var author in author_numPublications_dict)
    {
        if(!(author in sampleDataAuthorDict))
            delete author_numPublications_dict[author];
    }

    //uncomment to get the full list of authors
    // for(var author in author_numPublications_dict)
    // {
    //     if(author_numPublications_dict[author]<authornumPublicationsThresholdOverAllTimesteps)
    //         delete author_numPublications_dict[author];
    // }

    for(var year in filteredDataOfConferences)
    {
        for(var author in filteredDataOfConferences[year])
        {
            if(!(author in author_numPublications_dict))
            {
                delete filteredDataOfConferences[year][author];
            }
        }
    }

    // console.log("Number of authors: ",Object.keys(author_numPublications_dict).length,"  ",author_numPublications_dict);

    // timestep_yearsarray_dict
    var timestep_label_dict = {};
    for (var timestep in timestep_yearsarray_dict)
    {
        // var minYear = 9999;
        // var maxYear = -1;
        timestep_label_dict[timestep] = d3.min(timestep_yearsarray_dict[timestep]) + "-"+d3.max(timestep_yearsarray_dict[timestep]);
    }

    // makestring
    var rowHeader=[];
    if(groupConferences)
        rowHeader = Object.keys(domain_conf_dict);
    else
        rowHeader = selectedConferences;

    // var rowHeader = Object.keys(conf_domain_dict);
    var stringData = [];
    for(var year in filteredDataOfConferences)
    {
        // var stringTime="\"" + year + "\":";
        var stringArray = [[""]];
        var stringDictionary = {};
        for(var rowLabel of rowHeader)
        {
            stringArray.push([rowLabel+""]);
        }
        for(var author in filteredDataOfConferences[year])
        {
            stringArray[0] += ","+author;
            for(var i=1; i<stringArray.length; i++)
            {
                // console.log(filteredDataOfConferences[year][author][rowHeader[i-1]]);
                if(rowHeader[i-1] in filteredDataOfConferences[year][author])
                    stringArray[i] += ","+filteredDataOfConferences[year][author][rowHeader[i-1]].count;
                else
                stringArray[i] += ",0";
            }
        }
        var concatenatedString ="";

        for(var i=0; i<stringArray.length; i++)
        {
            stringArray[i] += "&&&";
            concatenatedString += stringArray[i];
        }
        stringDictionary[timestep_label_dict[year]] = concatenatedString;
        stringData.push(stringDictionary);
    }
    // console.log(rowHeader, filteredDataOfConferences);

    console.log(JSON.stringify(stringData));
    window.paperInformation = filteredDataOfConferences;
    window.timeStepsInfo = timestep_yearsarray_dict;
    window.rowHeaders = rowHeader;
    console.log(JSON.stringify(window.paperInformation));
    console.log(JSON.stringify(window.timeStepsInfo));
    console.log(JSON.stringify(window.rowHeaders));
    return stringData;



}
function listOfPapers(selectedVersions, author)
{
    var resultArray={};
    for(var setname of window.rowHeaders)
    {
        resultArray[setname]=[];
    }
    var timestepsArray = [];
    for(var i=0; i<window.selectedVersions.length; i++ )
    {
        // if( ((Math.pow(2,i)& selectedVersions) >0 ) || Math.pow(2,i) == selectedVersions)
        timestepsArray.push(Math.log2(window.selectedVersions[i])+1);
    }
    // console.log(timestepsArray);
    for(var timestep of timestepsArray)
    {
        for(var setname of window.rowHeaders)
        {
            if(author in window.paperInformation[timestep])
                resultArray[setname] = resultArray[setname].concat(window.paperInformation[timestep][author][setname].papers);
        }
    }
    for(var setname in resultArray)
    {
        if(resultArray[setname].length ==0)
            delete resultArray[setname];
        else
            resultArray[setname].sort(function(a,b){
                return a.year - b.year;
            })
    }

    // console.log(resultArray);
    d3.select("#paperList").selectAll("*").remove();
    var container = d3.select("#paperList");
    for(var setname in resultArray)
    {
        var setContainer = d3.select("#paperList").append("div");
        setContainer.append("h6").text(setname);
        var list = setContainer.append("ol");
        for(var d of resultArray[setname])
        {
            // row.append("tspan").text(function(d,i){
            //     return i+". ";
            // });
            var row = list.append("li");
            row.append("tspan").text(function(){
                return "\""+d.title + "\", ";
            });
            row.append("tspan").text(function(){
                return d.area + ", ";
            });
            row.append("tspan").text(function(){
                return d.year + " ";
            });
        }
    }
    document.getElementById('paperInfo').style.display='block';
}