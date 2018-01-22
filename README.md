# Flight path with solar terminator

On a flight from Tokyo to Zurich, I was wondering why I could see a sunset (and sunrise, but I was probably asleep at that point), even though the departure time was 11am and arrival in Zurich was 3:30 pm, both during daylight. 

On another note, I always wanted to learn how to make these neat visualizations in D3.js. 
Oh, and that requires javascript, which I haven't touched since ca. 2002.
So, learning by doing, I went ahead and created this little page.

## Notes

The locations for the airports are from [OpenFlights](https://openflights.org/data.html). There is a Jupyter notebook to strip down the csv to only the required columns in `notebooks/`.

For saving the SVG as png or gif, I used [saveSvgAsPng](https://github.com/exupero/saveSvgAsPng). Since I haven't figured out yet how to productively work with npm and a lot of the other tools in the javascript ecosystem, I'll just leave the link here.

To put the frames together into an animated gif, there is another Jupyter notebook, using the imageio package.
