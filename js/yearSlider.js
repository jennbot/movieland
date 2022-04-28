class Slider {
    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 1000,
            containerHeight: 100,
            margin: {top: 40, right: 15, bottom: 30, left: 35}
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.x = d3.scaleLinear()
            .domain([2011, 2020])
            .range([0, vis.width-10])
            .clamp(true);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // SVG Group containing the actual slider;
        vis.slider = vis.svg.append('g')
            .attr("class", "slider")
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
    }

    updateVis() {
        let vis = this;
        vis.sliderVals=[2011, 2020];
        vis.xMin = vis.x(2011);
        vis.xMax = vis.x(2020);
        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        //render slider body
        vis.slider.append("line")
            .attr("class", "track")
            .attr("x1", 10+vis.x.range()[0])
            .attr("x2", 10+vis.x.range()[1])

        //range of the slider
        vis.selRange = vis.slider.append("line")
            .attr("class", "sel-range")
            .attr("x1", 10+vis.x(vis.sliderVals[0]))
            .attr("x2", 10+vis.x(vis.sliderVals[1]))


        vis.slider.insert("g", ".track-overlay")
            .attr("class", "ticks")
            .attr("transform", "translate(10,24)")
            .selectAll("text")
            .data(vis.x.ticks(10))
            .enter().append("text")
            .attr("x", vis.x)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .text(d => d);

        //Slider rectangular end part
        vis.handle = vis.slider.selectAll("rect")
            .data([0, 1])
            .enter().append("rect", ".track-overlay")
            .attr("class", "handle")
            .attr("y", -8)
            .attr("x", d => vis.x(vis.sliderVals[d]))
            .attr("rx", 3)
            .attr("height", 16)
            .attr("width", 20)
            .call(
                d3.drag()
                    .on("start", function() {
                        d3.select(this).classed("active", true);
                    })
                    .on("drag", function(event,d) {
                        let x1 = event.x;
                        if(x1>vis.xMax){
                            x1=vis.xMax
                        }else if(x1<vis.xMin){
                            x1=vis.xMin
                        }
                        d3.select(this).attr("x", x1);
                        let x2=vis.x(vis.sliderVals[d===0?1:0])
                        vis.selRange
                            .attr("x1", 10+x1)
                            .attr("x2", 10+x2)
                    })
                    .on("end", function(event,d) {
                        let v=Math.round(vis.x.invert(event.x))
                        let elem=d3.select(this)
                        vis.sliderVals[d] = v
                        let v1=Math.min(vis.sliderVals[0], vis.sliderVals[1]),
                            v2=Math.max(vis.sliderVals[0], vis.sliderVals[1]);
                        elem.classed("active", false)
                            .attr("x", vis.x(v));
                        vis.selRange
                            .attr("x1", 10+vis.x(v1))
                            .attr("x2", 10+vis.x(v2))
                        vis.dispatcher.call('filterYear', event, vis.sliderVals)
                    })
            );
    }
}