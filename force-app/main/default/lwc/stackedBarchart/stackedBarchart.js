import { LightningElement, track, api } from 'lwc';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {loadScript} from 'lightning/platformResourceLoader';
import D3 from '@salesforce/resourceUrl/D3js';

export default class stackedBarchart extends LightningElement {
  @track data = null
  @track subgroups = null
  @track groups = null
  @track height = null
  @track width = null

  @api title = null



  loading = true;

  palette = [
    "#2F00FF", "#B7A2D7", "#1E1926","#362B48", "#3A9CB8", "#2D6577", "#B1CBD4", "#006B47"
  ]
  colorIndex = 0;

  d3Initialized = false;
  dataInitialized = this.data != null;

  get isLoading(){
    return this.loading;
  }


  renderedCallback() {
    if (this.d3Initialized) return;
  
    this.d3Initialized = true;

    loadScript(this, D3 + '/d3.min.js')
      .then(() => {
        if(this.dataInitialized){
          this.renderChart();
        }
      })
      .catch(error => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error loading D3',
            message: error.message,
            variant: 'error'
          })
        );
      });
   }

  calculateMaxHeight() {
    let maxValue = 0;

  
    if (this.data ===  null) {
      return maxValue;
    }
  
    this.data.forEach((set) => {
      let summatory = 0;
      const [_year, ...values] = Object.values(set);
      summatory += values.reduce((a, b) => a + b, 0);

      if (summatory > maxValue) {
        maxValue = summatory;
      }
    });
  
    const paddingPercentage = 0.1;
    maxValue = maxValue * (1 + paddingPercentage);

    return maxValue;
  }

  generateColorPalette(number){
    const palette = [];

    for(let i = 0; i < number; i++){
      palette.push(this.palette[this.colorIndex]);
      this.colorIndex++;
    }

    return palette
  }

  prepareChartContainer(){
    const margin = {top: 10, right: 30, bottom: 20, left: 50};
    // const width = 900;
    // const height = 500;
    const maxHeight = this.calculateMaxHeight();

    let svg = d3.select(this.template.querySelector('.barchart'));

    svg.selectAll("*").remove();

    const minBarWidth = 30;
    const numDataPoints = this.groups.length;
    const totalHeight = this.height + margin.top + margin.bottom;
    const totalWidth = Math.max(numDataPoints * minBarWidth, minBarWidth * 2);   
    
    svg = svg.append("svg")
                // .attr("viewBox", `0 0 ${totalHeight} ${totalWidth}`)
                .attr("width", this.width + margin.left + margin.right)
                .attr("height", this.height + margin.top + margin.bottom)
              .append("g")
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    const barWidth = Math.max(totalWidth / numDataPoints, minBarWidth);

    const x = d3.scaleBand()
          .domain(this.groups)
          .range([0, this.width])
          .padding([0.1])
          // .paddingInner(0.1) // Adjust inner padding
          // .align(0.5); // Adjust bar alignment within the band scale

    x.bandwidth(barWidth);

    svg.append('g')
    .attr('transform', 'translate(0,' + this.height + ')')
    .call(d3.axisBottom(x).tickSizeOuter(0));

    const y = d3.scaleLinear()
        .domain([0, maxHeight])
        .range([this.height, 0])

    svg.append('g')
        .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

    return {svg, x, y, barWidth}
  }

  prepareColors(){
    return d3.scaleOrdinal()
              .domain(this.subgroups)
              .range(this.generateColorPalette(this.subgroups.length));
  }

  generateTooltip(){
    const tooltip = d3.select(this.template.querySelector('.barchart')).append("div")
                        .attr("id", "chart")
                        .attr("class", "tooltip")
    
    const mouseover = function(d) {
      tooltip.style("opacity", .8)
      d3.select(this).style("opacity", .5)
    }
    // const mousemove = function(event, d){
    //   const formatter = d3.format(",");

    //   tooltip
    //     .html("$" + formatter(d[1] - d[0]))
    //     .style("left", event.pageX - 20 + "px")
    //     .style("top", event.pageY - 600 + "px")
    // } 

    const mousemove = function(event, d){
      const formatter = d3.format(",");

      tooltip
        .html("$" + formatter(d[1] - d[0]))
        .style("left", event.pageX - 20 + "px")
        .style("top", event.pageY - 600 + "px")
    }


    const mouseleave = function(d) {
      tooltip.style("opacity", 0)
      d3.select(this).style("opacity", 1)
    }

    return {mouseover, mousemove, mouseleave}
  }

  generateBars({ svg, x, y, color, mouseover, mousemove, mouseleave }) {
    const stackedData = d3.stack().keys(this.subgroups)(this.data);
    const positionBy = Object.keys(this.data[0])[0];

    // Use a group to properly position the bars
    const groups = svg
      .selectAll('.group')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'group')
      .style('fill', (d) => color(d.key));
  
    groups
      .selectAll('rect')
      .data((d) => d) // Data for individual bars
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.data[positionBy])) // Use the 'year' property to position bars
      .attr('y', (d) => y(d[1])) // Use the top value of the stack
      .attr('height', (d) => y(d[0]) - y(d[1])) // Calculate the height of the bar
      .attr('width', x.bandwidth())
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave)

    // Generate the summatory of each stacked bar group and add it on the top of them

      // Calculate the summation for each stacked bar group
      const summations = this.data.map((set) => {
        let summatory = 0;
        const [_year, ...values] = Object.values(set);
        summatory = values.reduce((a, b) => a + b, 0);
        return summatory;
      });
  }
  

  generateLegends(color){
    const legendContainer = d3.select(this.template.querySelector('.legend-container'));
    const legend = legendContainer.append('ul')
        .attr('class', 'legend');

    const legendItems = legend.selectAll('li')
        .data(this.subgroups)
        .enter()
        .append('li')
        .append('div')
        .attr('class', 'legend-item');  

    legendItems.append('span')
        .text('□□')
        .attr('class', 'legend-color-box') // Update class to 'legend-color-box'
        .style('background-color', (d) => color(d))
        .style('color', 'transparent')

    legendItems.append('span')
        .attr('class', 'legend-label')
        .text((d) => '  ' + d);
  }


  @api renderChart(){
    let {svg, x, y, barWidth} = this.prepareChartContainer();
    const color = this.prepareColors();
    const {mouseover, mousemove, mouseleave} = this.generateTooltip();

    this.generateBars({svg, x, y, color, barWidth, mouseover, mousemove, mouseleave});

    this.generateLegends(color);

   
    this.loading = false;
   }

  @api setSubgroups(subgroups){
    this.subgroups = subgroups;
  }
  @api setGroups(groups){
      this.groups = groups;
  }
  @api setDataset(dataset){
      this.data = dataset;
  }
  @api setHeight(height){
    this.height = height;
  }
  @api setWidth(width){
    this.width = width;
  }
}