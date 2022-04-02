/*************** DATASET FORMAT ***************/
// ngrams - article - *.csv : wordcount of each article from 1 to n
// ngrams - article 1-10.csv : the aggregated word count of n articles 
// article.csv : article metadata

  var article = [];
  //By default show dataset of all articles
  article[0] = d3.csv('dataset/ngrams - article 1-10.csv').then(display);
  displayArticleInfo(0);

  // Create working dataset
  var articleRef = d3.csv('dataset/article.csv').then(function(data){
    data.forEach(x=>{
      articleRef[x.article_id]={
        'title': x.title,
        'author': x.author
      }
    });
    loadArticle();
  });


// Display the list of articles from csv to UI
// Loading article depends on naming convention and unique number in csv name.
function loadArticle(){

  //Display article title
  var count = 1;
  while (count<11){
    var article = d3.selectAll('.article-select')
    .append('div')
    .append('a')
    .attr('class','article-node')
    .attr('id',count)
    .text(articleRef[count].title);
    count++;
  }

  //Run through all article to assign unique id and link to csv file for on-click event
  d3.selectAll('a.article-node').on('click',function(){
    var articleID = d3.select(this).attr("id");
    if (articleID!=0){
      loadFile('dataset/ngrams - article '+articleID+'.csv'); 
    } else{
      loadFile('dataset/ngrams - article 1-10.csv'); // the csv of all articles
    }
    displayArticleInfo(articleID);
  });

  //Add selecting state for each article
  d3.selectAll('.article-select>div').on('click',function(){
    d3.selectAll('.article-select>div').attr('class',''); //Remove 'selected' class first    
    d3.select(this).attr('class','selected'); //Add 'selected' class for target object  
  });  

}

//Display title and author on top of visualization
function displayArticleInfo(articleID){
  //clear content before doing anything
  d3.selectAll('.article-header *').remove();

  if(articleID!=0){ // Not all article
    d3.selectAll('.article-header').append('h1').text(articleRef[articleID].title);
    d3.selectAll('.article-header').append('p').text('Author(s): ' + articleRef[articleID].author);
  }else{
    d3.selectAll('.article-header').append('h1').text('All articles');
    d3.selectAll('.article-header').append('p').text('Multiple authors');  
  }
}


// Load csv file to according article
function loadFile(file){
  d3.csv(file).then(display);
}

// new bubble chart instance
function display(data) {
  var myBubbleChart = bubbleChart();
  myBubbleChart('.visual-container', data);
}

// instantiate new bubble chart given a DOM element to display it in and a dataset to visualise
function bubbleChart() {
  const width = 980;
  const height = 900;
  const centre = { x: width/2, y: height/2 }; // location to centre the bubbles
  const forceStrength = 0.03; // strength to apply to the position forces

  // these will be set in createNodes and chart functions
  var svg = null;
  var bubbles = null;
  var labels = null;
  var nodes = [];

  // charge is dependent on size of the bubble, so bigger towards the middle
  function charge(d) {
    return Math.pow(d.radius, 2.0) * 0.01;
  }

  // create a force simulation and add forces to it
  const simulation = d3.forceSimulation()
    .force('charge', d3.forceManyBody().strength(charge))
    .force('center', d3.forceCenter(centre.x, centre.y))
    .force('x', d3.forceX().strength(forceStrength).x(centre.x))
    .force('y', d3.forceY().strength(forceStrength).y(centre.y))
    .force('collision', d3.forceCollide().radius(d => d.radius + 1));

  // force simulation starts up automatically, which we don't want as there aren't any nodes yet
  simulation.stop();

  var fillColour;
  var maxSize  = 0;
  var minSize  = 0;

  function createNodes(rawData) {

    maxSize = d3.max(rawData, d => +d.count);
    minSize = d3.min(rawData, d => +d.count);

    // size bubbles based on area
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxSize])
      .range([0, 80]);

    // set up colour scale  
    fillColour = d3.scaleSequential()
    .domain([1, maxSize])
    .interpolator(d3.interpolateWarm);

    // use map() to convert raw data into node data
    const myNodes = rawData.map(d => ({
      ...d,
      radius: radiusScale(+d.count),
      size: +d.count,
      x: Math.random() * 900,
      y: Math.random() * 700
    }));

    return myNodes;
  }

  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);

    //clear all svg before drawing
    d3.selectAll("svg").remove();

    // create svg element inside provided selector
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // bind nodes data to circle elements
    const elements = svg.selectAll('.bubble')
      .data(nodes, d => d.ngram)
      .enter()
      .append('g');

    bubbles = elements
      .append('circle')
      .classed('bubble', true)
      .attr('r', d => d.radius)
      .attr('fill', d => fillColour(d.size));

    // show word
    labels = elements
      .append('text')
      .style('text-anchor', 'middle')
      .append("tspan")
      .text(d => d.ngram);

    // show word count
    wordCount = elements
      .selectAll('text')
      .append("tspan")
      .attr('dy','1.1em')
      .text(d => d.size);

    // set simulation's nodes to our newly created nodes array
    // simulation starts running automatically once nodes are set
    simulation.nodes(nodes)
      .on('tick', ticked)
      .restart();  

    // show legend
    Legend(d3.scaleSequential([0, maxSize], d3.interpolateWarm), {
      title: "Word count"
    });
    bubbleSizeLegend(minSize,maxSize);
  }

  // Callback function called after every tick of the force simulation
  // Re-position x and y of circle and labels 
  function ticked() {
    bubbles
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    labels
      .attr('x', d => d.x)
      .attr('y', d => d.y);

    wordCount
      .attr('x', d => d.x)
      .attr('y', d => d.y);      
  }
  return chart;
}

/**************** DRAW LEGEND ********************/

// Copyright 2021, Observable Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/color-legend
// The code has been modified and removed unused code for this project
function Legend(color, {
  title,
  tickSize = 6,
  width = 320, 
  height = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  tickValues
} = {}) {

  function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
  }

  const svg = d3.selectAll('.legend-color').append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible")
      .style("display", "block");

  let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(color.copy()
        .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
        {range() { return [marginLeft, width - marginRight]; }});

    svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues))
      .call(tickAdjust)
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("text-anchor", "start")
        .attr("class", "title")
        .text(title));

  return svg.node();
}

/**************** DRAW LEGEND BUBBLE SIZE *******************/

function bubbleSizeLegend(minSize, maxSize){
  // append the svg object to the body of the page
  var height = 100
  var width = 220
  var svg = d3.select(".legend-size")
    .append("svg")
      .attr("width", width)
      .attr("height", height)

  // scaling
  var size = d3.scaleSqrt()
    .domain([1, maxSize])  // What's in the data, let's say it is percentage
    .range([1, 40])  // Size in pixel
  // Add legend: circles
  var valuesToShow = [minSize, d3.median([minSize, maxSize]), maxSize];
  var xCircle = 80;
  var xLabel = 180;
  var yCircle = 80;
  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("circle")
      .attr("cx", xCircle)
      .attr("cy", function(d){ return yCircle - size(d) } )
      .attr("r", function(d){ return size(d) })
      .style("fill", "none")
      .attr("stroke", "black")

  // Add segments
  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("line")
      .attr('x1', function(d){ return xCircle + size(d) } )
      .attr('x2', xLabel)
      .attr('y1', function(d){ return yCircle - size(d) } )
      .attr('y2', function(d){ return yCircle - size(d) } )
      .attr('stroke', 'black')
      .style('stroke-dasharray', ('2,2'))

  // Add labels
  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("text")
      .attr('x', xLabel)
      .attr('y', function(d){ return yCircle - size(d) } )
      .text( function(d){ return d } )
      .style("font-size", "0.7em")
      .style("font-weight", "bold")
      .attr('alignment-baseline', 'middle')
}