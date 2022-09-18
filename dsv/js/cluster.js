function clusterObjects(numCluster,typeOfClustering)
{
	var featureVectorMatrix=[]; // #objects x features   . Here feature = #sets * #timestamps
	var objs = allLattice.objects;
	var objectNames=[];
	for(var objkey in allLattice.objects)
	{	
		if(objkey>0)
		{


			var featureArray=[];
			for(var i=0; i< window.allVersions.length; i++)
	        {
				object = allLattice.objects[objkey];
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
			    	if(item!="compare")
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
			    var contributionsDictArray = Object.keys(contributions);
			    // console.log(contributions);
			    contributionsDictArray.sort(function(a, b)
		                            {  
		                              return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
		                            });
			    for(var z=0; z<contributionsDictArray.length; z++)
			    {
			    	featureArray.push(contributions[contributionsDictArray[z]]);
			    }
			}
			    featureVectorMatrix.push(featureArray);
			    objectNames.push(allLattice.objects[objkey].name);
		}  

	}
    // console.log(featureVectorMatrix);
	
/*!
 * Figue v1.0.1
 *
 * Copyright 2010, Jean-Yves Delort
 * Licensed under the MIT license.
 *
 */


var figue = function () {


	function euclidianDistance (vec1 , vec2) {
		var N = vec1.length ;
		var d = 0 ;
		for (var i = 0 ; i < N ; i++)
			d += Math.pow (vec1[i] - vec2[i], 2)
		d = Math.sqrt (d) ;
		return d ;
	}

	function manhattanDistance (vec1 , vec2) {
		// var N = vec1.length ;
		// var d = 0 ;
		// for (var i = 0 ; i < N ; i++)
		// 	d += Math.abs (vec1[i] - vec2[i])
		// return d ;
		var numberOfBaseSets = 3;
		var distance = 0;
		

		// for(var i=0; i<vec1.length; i = i+numberOfBaseSets)
		// {
		// 	var contributioninallsetsv1 = 0;
		// 	var contributioninallsetsv2 = 0;
		// 	for(var j=0; j<numberOfBaseSets; j++)
		// 	{
		// 		contributioninallsetsv1 += vec1[i+j];
		// 		contributioninallsetsv2 += vec2[i+j];
		// 	}

		// }
		// var max = contributioninallsetsv1>contributioninallsetsv2? contributioninallsetsv1: contributioninallsetsv2;
		// if(max ==0) max=1;
		// var N = vec1.length ;
		// var d = 0 ;
		// for (var i = 0 ; i < N ; i++)
		// 	d += (Math.abs (vec1[i] - vec2[i]))/(max);
		// return d ;


		// Weighted Jaccard approach
		// var N = vec1.length ;
		// var minSum=0;
		// var maxSum=0;
		// for (var i = 0 ; i < N ; i++)
		// {
		// 	if(vec1[i] < vec2[i])
		// 		{
		// 			minSum += vec1[i];
		// 			maxSum += vec2[i];
		// 		}
		// 	else{
		// 			minSum += vec2[i];
		// 			maxSum += vec1[i];
		// 	}
		// }
		// if(maxSum==0) return 0
		// else return (1- (minSum*1.0)/maxSum );


		// String similarity approach --NOT WORKING
		// var N = vec1.length ;
		// var d = 0 ;
		// var differences = 0;
		// for (var i = 0 ; i < N ; i++)
		// {
		// 	if((vec1[i] > 0 && vec2[i] ==0)||(vec1[i]==0 && vec2[i]>0))
		// 	{
		// 		differences++;
		// 	}
		// }
		// // console.log(differences);
		// return differences ;

		// Binary Jaccard approach
		var N = vec1.length ;
		var d = 0 ;
		var intersection = 0;
		var union = 0;
		for (var i = 0 ; i < N ; i++)
		{
			if((vec1[i] > 0 && vec2[i] >0))
			{
				intersection++;
			}
			if((vec1[i] > 0 || vec2[i] >0))
				union++;
		}
		if (union ==0) return 0
		else return (1- (intersection*1.0)/union )

	}

	function maxDistance (vec1 , vec2) {
		var N = vec1.length ;
		var d = 0 ;
		for (var i = 0 ; i < N ; i++)
			d = Math.max (d , Math.abs (vec1[i] - vec2[i])) ;
		return d ;
	}

	function addVectors (vec1 , vec2) {
		var N = vec1.length ;
		var vec = new Array(N) ;
		for (var i = 0 ; i < N ; i++)
			vec[i] = vec1[i] + vec2[i] ;
		return vec ;
	}	

	function multiplyVectorByValue (value , vec) {
		// console.log(vec);
		var N = vec.length ;
		var v = new Array(N) ;
		for (var i = 0 ; i < N ; i++)
			v[i] = value * vec[i] ;
		return v ;
	}	
	
	function vectorDotProduct (vec1, vec2) {
		var N = vec1.length ;
		var s = 0 ;
		for (var i = 0 ; i < N ; i++)
			s += vec1[i] * vec2[i] ;
		return s ;
	}
	

	function repeatChar(c, n) {
		var str = "";
		for (var i = 0 ; i < n ; i++)
			str += c ;
		return str ;
	}
	
	function calculateCentroid (c1Size , c1Centroid , c2Size , c2Centroid) {
		var newCentroid = new Array(c1Centroid.length) ;
		var newSize = c1Size + c2Size ;
		for (var i = 0 ; i < c1Centroid.length ; i++) 
			newCentroid[i] = (c1Size * c1Centroid[i] + c2Size * c2Centroid[i]) / newSize ;
		return newCentroid ;	
	}


	function centerString(str, width) {
		var diff = width - str.length ;
		if (diff < 0)
			return ;

		var halfdiff = Math.floor(diff / 2) ;
		return repeatChar (" " , halfdiff) + str + repeatChar (" " , diff - halfdiff)  ;
	}

	function putString(str, width, index) {
		var diff = width - str.length ;
		if (diff < 0)
			return ;

		return repeatChar (" " , index) + str + repeatChar (" " , width - (str.length+index)) ;
	}

	function prettyVector(vector) {
		var vals = new Array(vector.length) ;
		var precision = Math.pow(10, figue.PRINT_VECTOR_VALUE_PRECISION) ; 
		for (var i = 0 ; i < vector.length ; i++)
			vals[i] = Math.round(vector[i]*precision)/precision ;
		return vals.join(",")
	}

	function prettyValue(value) {
		var precision = Math.pow(10, figue.PRINT_VECTOR_VALUE_PRECISION) ; 
		return String (Math.round(value*precision)/precision) ;
	}

	function generateDendogram(tree, sep, balanced, withLabel, withCentroid, withDistance) {
		var lines = new Array ;
		var centroidstr = prettyVector(tree.centroid) ;
		if (tree.isLeaf()) {
			var labelstr = String(tree.label) ;
			var len = 1;
			if (withCentroid) 
				len = Math.max(centroidstr.length , len) ;
			if (withLabel)
				len = Math.max(labelstr.length , len) ;

			lines.push (centerString ("|" , len)) ;
			if (withCentroid) 
				lines.push (centerString (centroidstr , len)) ;
			if (withLabel) 
				lines.push (centerString (labelstr , len)) ;

		} else {
			var distancestr = prettyValue(tree.dist) ;
			var left_dendo = generateDendogram(tree.left ,sep, balanced,withLabel,withCentroid, withDistance) ;
			var right_dendo = generateDendogram(tree.right, sep, balanced,withLabel,withCentroid,withDistance) ;
			var left_bar_ix = left_dendo[0].indexOf("|") ;
			var right_bar_ix = right_dendo[0].indexOf("|") ;
	
			// calculate nb of chars of each line
			var len = sep + right_dendo[0].length + left_dendo[0].length ;
			if (withCentroid) 
				len = Math.max(centroidstr.length , len) ;
			if (withDistance) 
				len = Math.max(distancestr.length , len) ;


			// calculate position of new vertical bar
			var bar_ix =  left_bar_ix + Math.floor(( left_dendo[0].length - (left_bar_ix) + sep + (1+right_bar_ix)) / 2) ;
			
			// add line with the new vertical bar 
			lines.push (putString ("|" , len , bar_ix)) ;
			if (withCentroid) {
				lines.push (putString (centroidstr , len , bar_ix - Math.floor (centroidstr.length / 2))) ; //centerString (centroidstr , len)) ;
			}
			if (withDistance) {
				lines.push (putString (distancestr , len , bar_ix - Math.floor (distancestr.length / 2))) ; //centerString (centroidstr , len)) ;
			}
				
			// add horizontal line to connect the vertical bars of the lower level
			var hlineLen = sep + (left_dendo[0].length -left_bar_ix) + right_bar_ix+1 ;
			var hline = repeatChar ("_" , hlineLen) ;
			lines.push (putString(hline, len, left_bar_ix)) ;
	
			// IF: the user want the tree to be balanced: all the leaves have to be at the same level
			// THEN: if the left and right subtrees have not the same depth, add extra vertical bars to the top of the smallest subtree
			if (balanced &&  (left_dendo.length != right_dendo.length)) {
				var shortest ;
				var longest ;
				if (left_dendo.length > right_dendo.length) {
					longest = left_dendo ;
					shortest = right_dendo ;
				} else {
					longest = right_dendo ;
					shortest = left_dendo ;
				}
				// repeat the first line containing the vertical bar
				header = shortest[0] ;
				var toadd = longest.length - shortest.length ;
				for (var i = 0 ; i < toadd ; i++) {
					shortest.splice (0,0,header) ;
				}
			}
		
			// merge the left and right subtrees 
			for (var i = 0 ; i < Math.max (left_dendo.length , right_dendo.length) ; i++) {
				var left = "" ;
				if (i < left_dendo.length)
					left = left_dendo[i] ;
				else
					left = repeatChar (" " , left_dendo[0].length) ;
	
				var right = "" ;
				if (i < right_dendo.length)
					right = right_dendo[i] ;
				else
					right = repeatChar (" " , right_dendo[0].length) ;
				lines.push(left + repeatChar (" " , sep) + right) ;	
				var l = left + repeatChar (" " , sep) + right ;
			}
		}
		
		return lines ;
	}



	function agglomerate (labels, vectors, distance, linkage) {
		var N = vectors.length ;
		var dMin = new Array(N) ;
		var cSize = new Array(N) ;
		var matrixObj = new figue.Matrix(N,N);
		var distMatrix = matrixObj.mtx ;
		var clusters = new Array(N) ;

		var c1, c2, c1Cluster, c2Cluster, i, j, p, root , newCentroid ;

		if (distance == figue.EUCLIDIAN_DISTANCE)
			distance = euclidianDistance ;
		else if (distance == figue.MANHATTAN_DISTANCE)
			distance = manhattanDistance ;
		else if (distance == figue.MAX_DISTANCE)
			distance = maxDistance ;

		// Initialize distance matrix and vector of closest clusters
		for (i = 0 ; i < N ; i++) {
			dMin[i] = 0 ;
			for (j = 0 ; j < N ; j++) {
				if (i == j)
					distMatrix[i][j] = Infinity ;
				else
					distMatrix[i][j] = distance(vectors[i] , vectors[j]) ;
	
				if (distMatrix[i][dMin[i]] > distMatrix[i][j] )
					dMin[i] = j ;
			}
		}
	
		// create leaves of the tree
		for (i = 0 ; i < N ; i++) {
			clusters[i] = [] ;
			clusters[i][0] = new Node (labels[i], null, null, 0, vectors[i]) ;
			cSize[i] = 1 ;
		}
		
		// Main loop
		for (p = 0 ; p < N-1 ; p++) {
			// find the closest pair of clusters
			c1 = 0 ;
			for (i = 0 ; i < N ; i++) {
				if (distMatrix[i][dMin[i]] < distMatrix[c1][dMin[c1]])
					c1 = i ;
			}
			c2 = dMin[c1] ;
	
			// create node to store cluster info 
			c1Cluster = clusters[c1][0] ;
			c2Cluster = clusters[c2][0] ;

			newCentroid = calculateCentroid ( c1Cluster.size , c1Cluster.centroid , c2Cluster.size , c2Cluster.centroid ) ;
			newCluster = new Node (-1, c1Cluster, c2Cluster , distMatrix[c1][c2] , newCentroid) ;
			clusters[c1].splice(0,0, newCluster) ;
			cSize[c1] += cSize[c2] ;
		
			// overwrite row c1 with respect to the linkage type
			for (j = 0 ; j < N ; j++) {
				if (linkage == figue.SINGLE_LINKAGE) {
					if (distMatrix[c1][j] > distMatrix[c2][j])
						distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j] ;
				} else if (linkage == figue.COMPLETE_LINKAGE) {
					if (distMatrix[c1][j] < distMatrix[c2][j])
						distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j] ;
				} else if (linkage == figue.AVERAGE_LINKAGE) {
					var avg = ( cSize[c1] * distMatrix[c1][j] + cSize[c2] * distMatrix[c2][j])  / (cSize[c1] + cSize[j]) 
					distMatrix[j][c1] = distMatrix[c1][j] = avg ;
				}
			}
			distMatrix[c1][c1] = Infinity ;
		
			// infinity ­out old row c2 and column c2
			for (i = 0 ; i < N ; i++)
				distMatrix[i][c2] = distMatrix[c2][i] = Infinity ;
	
			// update dmin and replace ones that previous pointed to c2 to point to c1
			for (j = 0; j < N ; j++) {
				if (dMin[j] == c2)
					dMin[j] = c1;
				if (distMatrix[c1][j] < distMatrix[c1][dMin[c1]]) 
					dMin[c1] = j;
			}
	
			// keep track of the last added cluster
			root = newCluster ;
		}
	
		return root ;
	}


	
	function getRandomVectors(k, vectors) {
		/*  Returns a array of k distinct vectors randomly selected from a the input array of vectors
			Returns null if k > n or if there are less than k distinct objects in vectors */
		
		var n = vectors.length ;
		if ( k > n ) 
			return null ;
		
		var selected_vectors = new Array(k) ;
		var selected_indices = new Array(k) ;
		
		var tested_indices = new Object ;
		var tested = 0 ;
		var selected = 0 ;
		var i , vector, select ;
		while (selected < k) {
			if (tested == n)
				return null ;
			
			var random_index = Math.floor(Math.random()*(n)) ;
			if (random_index in tested_indices)
				continue ;
			
			tested_indices[random_index] = 1;
			tested++ ;
			vector = vectors[random_index] ;
			select = true ;
			for (i = 0 ; i < selected ; i++) {
				if ( vector.compare (selected_vectors[i]) ) {
					select = false ;
					break ;
				}
			}
			if (select) {
				selected_vectors[selected] = vector ;
				selected_indices[selected] = random_index ; 
				selected++ ;
			}
		}
		return {'vectors': selected_vectors, 'indices': selected_indices} ;
	}
	
	function kmeans (k, vectors) {
		var n = vectors.length ;
		var assignments = new Array(n) ;
		var clusterSizes = new Array(k) ;
		var repeat = true ;
		var nb_iters = 0 ;
		var centroids = null ;
		
		var t = getRandomVectors(k, vectors) ;
		if (t == null)
			return null ;
		else
			centroids = t.vectors ;
			
		while (repeat) {

			// assignment step
			for (var j = 0 ; j < k ; j++)
				clusterSizes[j] = 0 ;
			
			for (var i = 0 ; i < n ; i++) {
				var vector = vectors[i] ;
				var mindist = Number.MAX_VALUE ;
				var best ;
				for (var j = 0 ; j < k ; j++) {
					manhattanDistance
					// dist = euclidianDistance (centroids[j], vector)
					dist = manhattanDistance (centroids[j], vector)
					if (dist < mindist) {
						mindist = dist ;
						best = j ;
					}
				}
				clusterSizes[best]++ ;
				assignments[i] = best ;
			}
		
			// update centroids step
			var newCentroids = new Array(k) ;
			for (var j = 0 ; j < k ; j++)
				newCentroids[j] = null ;

			for (var i = 0 ; i < n ; i++) {
				cluster = assignments[i] ;
				if (newCentroids[cluster] == null)
					newCentroids[cluster] = vectors[i] ;
				else
					newCentroids[cluster] = addVectors (newCentroids[cluster] , vectors[i]) ;	
			}

			for (var j = 0 ; j < k ; j++) {
				newCentroids[j] = multiplyVectorByValue (1/clusterSizes[j] , newCentroids[j]) ;
			}	
			
			// check convergence
			repeat = false ;
			for (var j = 0 ; j < k ; j++) {
				if (! newCentroids[j].compare (centroids[j])) {
					repeat = true ; 
					break ; 
				}
			}
			centroids = newCentroids ;
			nb_iters++ ;
			
			// check nb of iters
			if (nb_iters > figue.KMEANS_MAX_ITERATIONS)
				repeat = false ;
			
		}
		return { 'centroids': centroids , 'assignments': assignments} ;

	}
	
	function fcmeans (k, vectors, epsilon, fuzziness) {
		var membershipMatrix = new Matrix (vectors.length, k) ;
		var repeat = true ;
		var nb_iters = 0 ;
		
		var centroids = null ;
		
		var i,j,l, tmp, norm, max, diff ;
		while (repeat) {
			// initialize or update centroids
			if (centroids == null) {
				
				tmp = getRandomVectors(k, vectors) ;
				if (tmp == null)
					return null ;
				else
					centroids = tmp.vectors ;
				
			} else {
				for (j = 0 ; j < k; j++) {
					centroids[j] = [] ;
					norm = 0 ;
					for (i = 0 ; i < membershipMatrix.rows ; i++) {
						norm += Math.pow(membershipMatrix.mtx[i][j], fuzziness) ;
						tmp = multiplyVectorByValue( Math.pow(membershipMatrix.mtx[i][j], fuzziness) , vectors[i]) ;
						
						if (i == 0)
							centroids[j] = tmp ;
						else
							centroids[j] = addVectors (centroids[j] , tmp) ;
					}
					if (norm > 0)
						centroids[j] = multiplyVectorByValue(1/norm, centroids[j]);
					
					
				}
				
			}
			//alert(centroids);
			
			// update the degree of membership of each vector
			previousMembershipMatrix = membershipMatrix.copy() ;
			for (i = 0 ; i < membershipMatrix.rows ; i++) {
				for (j = 0 ; j < k ; j++) {
					membershipMatrix.mtx[i][j] = 0;
					for (l = 0 ; l < k ; l++) {
						if (euclidianDistance(vectors[i] , centroids[l]) == 0)
							tmp = 0 ;
						else
							tmp =  euclidianDistance(vectors[i] , centroids[j]) / euclidianDistance(vectors[i] , centroids[l]) ;
						tmp = Math.pow (tmp, 2/(fuzziness-1)) ;
						membershipMatrix.mtx[i][j] += tmp ;
					}
					if (membershipMatrix.mtx[i][j] > 0)
						membershipMatrix.mtx[i][j] = 1 / membershipMatrix.mtx[i][j] ;
				}
			}
			
			//alert(membershipMatrix) ;
			
			// check convergence
			max = -1 ;
			diff;
			for (i = 0 ; i < membershipMatrix.rows ; i++)
				for (j = 0 ; j < membershipMatrix.cols ; j++) {
					diff = Math.abs(membershipMatrix.mtx[i][j] - previousMembershipMatrix.mtx[i][j]) ;
					if (diff > max)
						max = diff ;
				}
			
			if (max < epsilon)
				repeat = false ;

			nb_iters++ ;

			// check nb of iters
			if (nb_iters > figue.FCMEANS_MAX_ITERATIONS)
				repeat = false ;
		}
		return { 'centroids': centroids , 'membershipMatrix': membershipMatrix} ;
	
	}
	
			
	function Matrix (rows,cols) 
	{
		this.rows = rows ;
		this.cols = cols ;
		this.mtx = new Array(rows) ; 

		for (var i = 0 ; i < rows ; i++)
		{
			var row = new Array(cols) ;
			for (var j = 0 ; j < cols ; j++)
				row[j] = 0;
			this.mtx[i] = row ;
		}
	}

	function Node (label,left,right,dist, centroid) 
	{
		this.label = label ;
		this.left = left ;
		this.right = right ;
		this.dist = dist ;
		this.centroid = centroid ;
		if (left == null && right == null) {
			this.size = 1 ;
			this.depth = 0 ;
		} else {
			this.size = left.size + right.size ;
			this.depth = 1 + Math.max (left.depth , right.depth ) ;
		}
	}



	return { 
		SINGLE_LINKAGE: 0,
		COMPLETE_LINKAGE: 1,
		AVERAGE_LINKAGE:2 ,
		EUCLIDIAN_DISTANCE: 0,
		MANHATTAN_DISTANCE: 1,
		MAX_DISTANCE: 200,
		PRINT_VECTOR_VALUE_PRECISION: 2,
		KMEANS_MAX_ITERATIONS: 10,
		FCMEANS_MAX_ITERATIONS: 3,

		Matrix: Matrix,
		Node: Node,
		generateDendogram: generateDendogram,
		agglomerate: agglomerate,
		kmeans: kmeans,
		fcmeans: fcmeans
	}
}() ;


figue.Matrix.prototype.toString = function() 
{
	var lines = [] ;
	for (var i = 0 ; i < this.rows ; i++) 
		lines.push (this.mtx[i].join("\t")) ;
	return lines.join ("\n") ;
}


figue.Matrix.prototype.copy = function() 
{
	var duplicate = new figue.Matrix(this.rows, this.cols) ;
	for (var i = 0 ; i < this.rows ; i++)
		duplicate.mtx[i] = this.mtx[i].slice(0); 
	return duplicate ;
}

figue.Node.prototype.isLeaf = function() 
{
	if ((this.left == null) && (this.right == null))
		return true ;
	else
		return false ;
}

figue.Node.prototype.buildDendogram = function (sep, balanced,withLabel,withCentroid, withDistance)
{
	lines = figue.generateDendogram(this, sep, balanced,withLabel,withCentroid, withDistance) ;
	return lines.join ("\n") ;	
}


Array.prototype.compare = function(testArr) {
    if (this.length != testArr.length) return false;
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].compare) { 
            if (!this[i].compare(testArr[i])) return false;
        }
        if (this[i] !== testArr[i]) return false;
    }
    return true;
}
var labels = objectNames;
// for(var p=0; p<numCluster; p++)labels.push(p+1);

if(typeOfClustering ==="kmeans")
	window.clusterResults = figue.kmeans(numCluster, featureVectorMatrix);
else if(typeOfClustering =="agg")
{
	window.clusterResults = figue.agglomerate(labels, featureVectorMatrix , figue.EUCLIDIAN_DISTANCE,figue.SINGLE_LINKAGE) ;
	var dendogram = window.clusterResults.buildDendogram (5, true, true, true, false) ;

	// Render the dendogram in the page (note: pre is handled differently by IE and the rest of the browsers)
	var pre = document.getElementById('mypre') ;
	if( document.all ) { pre.innerText = dendogram ; } else { pre.innerHTML = dendogram ; }
}
    console.log(clusterResults);
    var temp=[];
    
    for(var n=0; n<numCluster; n++)
    	temp[n] = [];


    for(var n=0; n<numCluster; n++)
    {
    	drawAuthorEvolution2(clusterResults.centroids[n], "Cluster "+(n));
    	
    }
    for(var k=0;k<clusterResults.assignments.length; k++)
    	{

	    	temp[clusterResults.assignments[k]].push([objectNames[k]]);

    	}
    console.log("Cluster Members: ",temp);

}

function drawAuthorEvolution2(featureArray, name)
{
    // if(authorSelectionEvolutionId.indexOf(selectedObjectId)<0)
    {
        // authorSelectionEvolutionId.push(selectedObjectId);
        window.authorEvolutionSvgHeight = (allConceptNames.length)*(guiParams.authorEvolutionSvgBarsHeight+ guiParams.authorEvolutionSvgBarsPadding);
        var tr = d3.select("#navigation table tbody").append("tr").attr("class", "authorEvolutionRow").attr("id",name ).attr('style','padding-top:15px');
        var authorNametd = tr.append("td");


        authorNametd.append("span").attr("style","padding-left:6px").text(name+": ");
        evolutionSvgContainer = tr.append("div").attr("id","authorEvolutionDiv").attr("class", "authorEvolutionDiv").attr("height", authorEvolutionSvgHeight);

        tr.append("td").append("img").attr("src","images/close.png")
                    .attr("height","20px")
                    .attr("width","20px")
                    .attr("style", "border:1;position:absolute")
                    .on("click", function(d,i){
                        var t = d3.select(this);
                        var td = t[0][0].parentNode;
                        // console.log(d,i, t[0][0].parentNode.parentNode.id);
                        var oid = parseInt(t[0][0].parentNode.parentNode.id);
                        // var index = authorSelectionEvolutionId.indexOf(oid);
                        // if (index > -1) {
                        //   authorSelectionEvolutionId.splice(index, 1);
                        // }

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
            var barscale = d3.scale.linear().domain([0, objectSizeScale[1]]).range([guiParams.previewWidth/4, guiParams.previewWidth]);
            
            var outertickheight = guiParams.authorEvolutionLegendHeight*4.0/10;
            var fontsize = guiParams.authorEvolutionLegendHeight*6.0/10;

            var svg = div.append('svg').classed("evolutionSVG", true)
                    .attr("width", guiParams.previewWidth)
                    .attr("height", authorEvolutionSvgHeight+guiParams.authorEvolutionLegendHeight);

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
                .text(objectSizeScale[1])
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


            // objectConcepts = object.concepts;
            // var filteredObjectConcepts=[];
            // for(var j=0; j<objectConcepts.length; j++)
            // {
            //     if(allVersions[i] in objectConcepts[j].weights)
            //         filteredObjectConcepts.push(objectConcepts[j]);
            // }

            // intersectionDict={};
            // conceptDict={};
            // contributions={};
            // for(var item in allConceptNames){
            //     contributions[allConceptNames[item]] = 0;
            // }

            // for(var j=0; j<filteredObjectConcepts.length; j++)
            // {
            //     var n = window.allLattice.concepts[filteredObjectConcepts[j].conceptId].name;
            //     if(n.length>0)
            //     {
            //         conceptDict[n]=true;
            //         if(objectConcepts[j].weights[allVersions[i]])
            //             contributions[n] = objectConcepts[j].weights[allVersions[i]];
            //     }
            // }
            var mincontrib=99999999;
            var maxcontrib = -99999999;

            var conceptDictArray=[];
            for (var q=0; q<allConceptNames.length; q++)
            {
            	var tempcontrib = featureArray[i*allConceptNames.length + q];

            	if(mincontrib>tempcontrib)mincontrib = tempcontrib;
            	if(maxcontrib<tempcontrib)maxcontrib = tempcontrib;

            	if(tempcontrib<1) tempcontrib=0;

            	conceptDictArray.push(tempcontrib);
            }
            tempDict={};
            for(var kk=0; kk< allConceptNames.length; kk++){
            	var reverse = allConceptNames.length - kk -1;
            	tempDict[allConceptNames[reverse]] = featureArray[i*allConceptNames.length + kk];
            }

            // console.log("min: ",mincontrib," max: ",maxcontrib);
            // var conceptDictArray = Object.keys(conceptDict);

            var tempDictArray = Object.keys(tempDict);

            tempDictArray.sort(function(a, b)
                                    {  
                                      return  allConceptNames.indexOf(b) - allConceptNames.indexOf(a) ;
                                    });

            // conceptDictArray.forEach(function(attr, index)
            // {
            // 	if(attr>0)
            // 	{
            // 		// console.log(attr, index);
	           //      pos = allConceptNames.indexOf(attr);
	           //      {   var pad =0;
	           //          var labelPad= 1;
	           //          var conceptTopPad = 0;
	           //          fillColor = colors_g[index];
	           //          svg.append('rect')
	           //              .attr("class", "textBackground")
	           //              .attr("x",0)
	           //              .attr("y", (guiParams.authorEvolutionLegendHeight+  index * (guiParams.authorEvolutionSvgBarsHeight + guiParams.authorEvolutionSvgBarsPadding) ))
	           //              .attr("width", barscale(attr))
	           //              .attr("height", guiParams.authorEvolutionSvgBarsHeight )
	           //              .attr("fill", fillColor);
	           //      }
            // 	}
            	
            // });

            tempDictArray.forEach(function(attr, index)
                {	
                	if(tempDict[attr] > 0)
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
                            .attr("width", guiParams.previewWidth/4 - 6)
                            .attr("height", guiParams.authorEvolutionSvgBarsHeight )
                            .attr("fill", fillColor);
	                    }
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
