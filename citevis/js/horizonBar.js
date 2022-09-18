function horizonBar()
{
    var scale;
    var minValue;
    var maxValue;
    this.bandValue = -1;
    var minbandValue;
    var width;
    var numLevels = 3;
    var pixelLengthPerUnit;
    var rotateValue = 0;
    this.bandScale;

    this.init = function (minVal, maxVal, bandVal, widthVal, rotateVal)
    {
        minValue = minVal;
        maxValue = maxVal;
        width = widthVal;
        rotateValue = rotateVal;
        minbandValue = maxValue/numLevels;
        this.setbandValue(bandVal);
        var scale = d3.scale.linear()
                    .domain([minValue, maxValue])
                    .range([0, width]);
        return this;
    }

    this.setbandValue = function(bandVal)
    {
        this.bandValue = bandVal;
        pixelLengthPerUnit = width/this.bandValue;
        return this;
    }

    this.setBandValueonPixelLengthPerUnit = function(pixelLengthperUnitVal)
    {

        this.bandValue = width/pixelLengthperUnitVal;
        pixelLengthPerUnit = width/this.bandValue;
        minbandValue = maxValue/numLevels;
        
        var maxPixelLength = width/minbandValue;
        var bandScale = d3.scale.linear()
                        .domain([0, this.bandValue])
                        .range([0, width]);
        this.bandScale = bandScale;

        // if(this.bandValue < minbandValue)
        // {
        //     console.log("[LOG] Max. pixel length per unit is: ", maxPixelLength, " band value: ", this.bandValue);
        // }
        console.log("[LOG] pixel length per unit is: ", pixelLengthPerUnit, " band value: ", this.bandValue);
        return this.bandScale;
    }

    this.drawHorizonBar = function(val, svgelem, xpos, ypos, height, colorVal)
    {
        if(val==39)
        {
            console.log(val);
        }
        var overFlowFlag = false;
        var level = Math.ceil(val/this.bandValue);
        if(level > numLevels)
        {
            overFlowFlag = true;
            level = numLevels;
        }
        var hbar = svgelem.append("g");
        
        // var opacityScale = d3.scale.linear()
        //                 .domain([1, numLevels])
        //                 .range([0.3, 1]);

        var colorScale = d3.scale.linear().domain([-1, numLevels]).range(["white", colorVal]);

        var barLengthScale = d3.scale.linear()
                        .domain([1, numLevels])
                        .range([height, 5]);
        
        for(var i=1; i<=level; i++)
        {
            var levelVal = 0, level1WrapFlag = false;

            levelVal = val - this.bandValue*(i-1);

            if(levelVal > this.bandValue) levelVal = this.bandValue;

            // if(val < this.bandValue)
            // {
            //     levelVal = val;
            // }
            // else if(val >= (this.bandValue*i)) 
            // {
            //     levelVal = this.bandValue;
            // }
            // else levelVal = (this.bandValue*i) - val;

            if(i==1)
            {
                if(barLengthScale(i) <= 0)
                    console.log(i, barLengthScale(i));
                hbar.append("rect").attr({
                    "x": xpos,
                    "y": ypos,
                    "width": this.bandScale(levelVal),
                    "height": barLengthScale(i),
                    // "fill-opacity": opacityScale(i),
                    "fill": colorScale(i),
                    "val": val,
                    "bandVal": this.bandValue
                });
            }
            else
            {
                hbar.append("rect").attr({
                    "x": xpos,
                    "y": ypos + (barLengthScale(1) - barLengthScale(i))/2,
                    "width": this.bandScale(levelVal),
                    "height": barLengthScale(i),
                    "fill": function(){ return colorScale(i); },
                });
            }
            
        }

        var labelxpos = xpos + width + 8;
        if(val >0)
        {
            hbar.append("text").attr({
                "x": labelxpos,
                "y": ypos + barLengthScale(1)/2,
                "class": "hBarValueLabel",
                "transform": `rotate( ${rotateValue*(-1)} ,${labelxpos}, ${ypos + barLengthScale(1)/2})`
            }).text(val);
        }

        if(overFlowFlag)
        {
            hbar.append("line").attr({
                "x1": xpos + this.bandScale(this.bandValue) - 25,
                "y1": ypos,
                "x2": xpos + this.bandScale(this.bandValue) - 15,
                "y2": ypos + barLengthScale(1),
                "class": "overflowLines"
            });

            hbar.append("line").attr({
                "x1": xpos + this.bandScale(this.bandValue) - 18,
                "y1": ypos,
                "x2": xpos + this.bandScale(this.bandValue) - 8,
                "y2": ypos + barLengthScale(1),
                "class": "overflowLines"
            });
        }
        hbar.attr("transform", `rotate(${rotateValue}, ${xpos}, ${ypos})`);

        return hbar;

    }

    return this;
}