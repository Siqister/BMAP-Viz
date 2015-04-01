/* Part 6 Rearranging DOM */


/*Start by setting up the canvas */
var margin = {t:100,r:300,b:100,l:300};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

var sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(15)
    .size([width,height]);
var path = sankey.link();

var nodes1 = [], links = [];
nodes = ["under 25k","25-50","50-75","75-100","over 100","very car dependent","car dependent","somewhat walkable","very walkable","walkersparadise"];

/* Acquire and parse data */
d3.csv('data/walk_score_by_income.csv', parse, dataLoaded);

function dataLoaded(err,rows){

    nodes.forEach(function(node){
        nodes1.push({'name':node})
    })

    sankey
        .nodes(nodes1)
        .links(links)
        .layout(32);


    draw();
}

function draw(){



    var link = canvas.append('g').selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class','link')
        .attr('d',path)
        .style('stroke-width',function(d){return d.dy})
        .style('fill','none')
        .style('stroke','black')
        .style('stroke-opacity',.5);
    var node = canvas.append('g').selectAll('node')
        .data(nodes1)
        .enter()
        .append('g')
        .attr('class','node')
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .call(d3.behavior.drag()
            //.origin(function(d){ return d;})
            .on('drag',dragmove)

        );

    node.append('rect')
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth());
    node.append('text')
        .text(function(d){return d.name});

    function dragmove(d){
        d3.select(this).attr("transform", "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
        sankey.relayout();
        link.attr("d", path);
    }

}

function parse(row,i){
    //@param row is each unparsed row from the dataset
    var income = row['income'];
    delete row['income'];

    for(var key in row){
        links.push({
            source:nodes.indexOf(income),
            target:nodes.indexOf(key),
            value:+row[key]
        })
    }
}