class Histogram {
  constructor(_config, _data, _dispatcher, _colorScale) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 700,
      containerHeight: 400,
      margin: { top: 30, right: 200, bottom: 30, left: 30 },
    };
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.colorScale = _colorScale;
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Initialize scales and axes
    vis.yScale = d3.scaleLinear().range([vis.height - 10, 0]);

    vis.xScale = d3.scaleLinear().domain([6.5, 8.8]).range([0, vis.width]);

    vis.xAxis = d3.axisBottom(vis.xScale).tickSizeOuter(0);

    vis.yAxis = d3
      .axisLeft(vis.yScale)
      .ticks(6)
      .tickSize(-vis.width)
      .tickSizeOuter(0);

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // SVG Group containing the actual chart;
    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chart
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height - 10})`);

    // Append y-axis group
    vis.yAxisG = vis.chart.append('g').attr('class', 'axis y-axis');

    // Append chart and axis title
    vis.svg
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', 46)
      .attr('y', 3)
      .attr('dy', '.8em')
      .text('Total movie counts per rating score group colored by genre');

    vis.svg
      .append('text')
      .attr('class', 'axis-text')
      .attr('x', 420)
      .attr('y', 385)
      .attr('dy', '.8em')
      .text('Rating Score');
    vis.renderLegend();
  }

  updateVis() {
    let vis = this;
    //deep copy
    let genreData = JSON.parse(JSON.stringify(vis.data));
    //Only include 7 genre + Other
    genreData.forEach((d) => {
      if (
        d.genre != 'Crime' &&
        d.genre != 'Comedy' &&
        d.genre != 'Drama' &&
        d.genre != 'Animation' &&
        d.genre != 'Action' &&
        d.genre != 'Biography' &&
        d.genre != 'Adventure'
      ) {
        d.genre = 'Other';
      }
    });
    // set the parameters for the histogram
    vis.histogram = d3
      .histogram()
      .value(function (d) {
        return d.score;
      })
      .domain(vis.xScale.domain())
      .thresholds(vis.xScale.ticks(12));

    vis.bins = vis.histogram(genreData);
    vis.yScale.domain([
      0,
      d3.max(vis.bins, function (d) {
        return d.length;
      }),
    ]);

    //Unique key values (genre)
    vis.keys = [...new Set(genreData.map((d) => d.genre))];

    //Create stack data for rendering.
    vis.stackData = [];
    for (let bin in vis.bins) {
      let pushableObject = {};
      // add the rate boundaries.
      pushableObject.x0 = vis.bins[bin].x0;
      pushableObject.x1 = vis.bins[bin].x1;
      // for each bin, split the data into the different keys.
      vis.bins[bin].forEach(function (d) {
        if (!pushableObject[d.genre]) {
          pushableObject[d.genre] = [d];
        } else pushableObject[d.genre].push(d);
      });
      // if any of the keys didn't get represented in this bin, give them empty arrays for the stack function.
      vis.keys.forEach(function (key) {
        if (!pushableObject[key]) {
          pushableObject[key] = [];
        }
      });
      vis.stackData.push(pushableObject);
    }

    vis.stacked = d3
      .stack()
      .keys(vis.keys)
      .value(function (d, key) {
        return d[key].length;
      });
    vis.renderVis();
  }

  renderVis() {
    let vis = this;
    //render bars
    let bar = vis.chart
      .selectAll('.bars')
      .data(vis.stacked(vis.stackData), (d) => d.key)
      .join(
        (enter) => {
          let bar = enter
            .append('g')
            .attr('class', 'bars')
            .attr('fill', function (d, i) {
              return vis.colorScale(d.key);
            });
          bar
            .selectAll('rect')
            .data((d) => d)
            .join('rect')
            //distinguish between select and not select arrows by class
            .attr('class', function (d) {
              return 'bar' + String(d.data.x0).replaceAll('.', '');
            })
            .attr('x', 2)
            .attr('transform', function (d) {
              return (
                'translate(' +
                vis.xScale(d.data.x0) +
                ',' +
                vis.yScale(d[1]) +
                ')'
              );
            })
            .attr('width', function (d) {
              if (vis.xScale(d.data.x1) - vis.xScale(d.data.x0) === 0) {
                return 0;
              } else {
                return vis.xScale(d.data.x1) - vis.xScale(d.data.x0) - 1;
              }
            })
            .attr('height', function (d) {
              return vis.yScale(d[0]) - vis.yScale(d[1]);
            })
            .on('click', updateClick);
          return bar;
        },
        (update) => {
          update
            .selectAll('rect')
            .data((d) => d)
            .join('rect')
            .attr('x', 2)
            .attr('transform', function (d) {
              return (
                'translate(' +
                vis.xScale(d.data.x0) +
                ',' +
                vis.yScale(d[1]) +
                ')'
              );
            })
            .attr('width', function (d) {
              if (vis.xScale(d.data.x1) - vis.xScale(d.data.x0) === 0) {
                return 0;
              } else {
                return vis.xScale(d.data.x1) - vis.xScale(d.data.x0) - 1;
              }
            })
            .attr('height', function (d) {
              return vis.yScale(d[0]) - vis.yScale(d[1]);
            })
            .on('click', updateClick);
          return update;
        }
      );
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    //function for clicking event
    function updateClick(event, d) {
      const isActive = d3.select(this).classed('selected');
      d3.selectAll('.bars').classed('selected', false);
      let className = '.bar' + String(d.data.x0).replaceAll('.', '');
      d3.selectAll(className).classed('selected', !isActive);
      //update global rate range
      let range = {};
      if (!isActive) {
        range.begin = d.data.x0;
        range.end = d.data.x1;
        rate.push(range);
      } else {
        rate = rate.filter(a => a.begin !== d.data.x0);
      }
      vis.dispatcher.call('filterRate', event);
    }
  }

  renderLegend() {
    let vis = this;
    vis.legend = vis.svg.append('g').attr('transform', `translate(450,30)`);

    vis.legend
      .append('rect')
      .attr('class', 'outline')
      .attr('width', 170)
      .attr('height', 225)
      .attr('rx', 8);

    let genres = [
      'Action',
      'Adventure',
      'Animation',
      'Biography',
      'Comedy',
      'Crime',
      'Drama',
      'Other',
    ];
    vis.legend
      .selectAll('hist-dots')
      .data(genres)
      .join('circle')
      .attr('cx', 35)
      .attr('cy', function (d, i) {
        return 22 + i * 25;
      })
      .attr('r', 7)
      .style('fill', (d) => vis.colorScale(d));

    vis.legend
      .selectAll('hist-legend-labels')
      .data(genres)
      .join('text')
      .attr('class', 'hist-legend-labels')
      .attr('x', 35 + 25)
      .attr('y', function (d, i) {
        return 22 + i * 25;
      })
      .style('fill', 'black')
      .text(function (d) {
        return d;
      })
      .attr('text-anchor', 'left')
      .style('alignment-baseline', 'middle');
  }
}
