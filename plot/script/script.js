/* Part 6 Rearranging DOM */


/*Start by setting up the canvas */
var margin = {t:50,r:200,b:50,l:200};
var width = $('.canvas').width() - margin.r - margin.l,
    height = $('.canvas').height() - margin.t - margin.b;

console.log(height);

var canvas = d3.select('.canvas')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//scales
var scale={};
scale.x = d3.scale.linear().domain([30,100]).range([0,390]);
scale.y = d3.scale.linear().domain([0,50]).range([440,0]);
scale.size = d3.scale.linear().domain([10000,50000]).range([10,30]);

//axis
var axisX = d3.svg.axis()
    .scale(scale.x)
    .orient('bottom');
var axisY = d3.svg.axis()
    .scale(scale.y)
    .orient('left');

//Specific to this viz

d3.csv("data/walkscore_obese.csv",parse,loaded);

function parse(d){
    return {
        n:d.n,
        ws:+d.ws,
        obese:+d.obese,
        pop:+d.pop
    }
}

function loaded(err,data){
    canvas.append('g')
        .attr('class','axis x')
        .attr('transform','translate(0,'+440+')')
        .call(axisX);
    canvas.append('g')
        .attr('class','axis y')
        .call(axisY);

    var hoods = canvas.selectAll('.hood')
        .data(data)
        .enter()
        .append('g')
        .attr('class','hood')
        .attr('transform',function(d){
            return 'translate('+ scale.x(d.ws) +','+ scale.y(d.obese) + ')';
        });
    hoods
        .append('circle')
        .attr('r',function(d){
            return scale.size(d.pop);
        })
        .style('fill','rgba(200,200,200,.5)')
        .style('stroke','rgb(100,100,100)')
        .style('stroke-width','1px');

    hoods
        .append('circle')
        .attr('r',3)
        .style('fill','white')
        .style('stroke','rgb(50,50,50)')
        .style('stroke-width','1px');

    hoods.append('text')
        .text(function(d){return d.n;})
}

