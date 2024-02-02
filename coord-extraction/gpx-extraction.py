import gpxpy.gpx
import os.path

# Parsing an existing file:
# -------------------------
gpx_file = open('test-flight-data/2023-04-04.gpx', 'r')
# gpx_file = open('test-flight-data/Jan-19th-2023-13-33-52-Flight-Airdata.gpx', 'r')
# gpx_file = open('hgb-data/maps1.gpx', 'r')
# gpx_file = open('hgb-gpx/run2.gpx', 'r')
# gpx_file = open('hgb-gpx/maps3.gpx', 'r')
gpx = gpxpy.parse(gpx_file)
# print(gpx)

coords = []
for track in gpx.tracks:
    for segment in track.segments:
        for point in segment.points:
            coords.append([point.longitude, point.latitude, point.elevation])
            # print(f'Point at ({point.latitude},{point.longitude}) -> {point.elevation}')

# original coords
doc_name = 'flight1'
save_path = 'hgb-txt/'
doc_name_path = os.path.join(save_path, doc_name + ".txt")
with open(doc_name_path, 'w') as f:
    for element in coords:
        formatted_item = f"{element},\n"  # Add a line break after each element
        f.write(formatted_item)

# chopped coords
# chopped_coords = coords[::1000]
# with open(doc_name+'.txt', 'w') as f:
#     for element in chopped_coords:
#         formatted_item = f"{element},\n"  # Add a line break after each element
#         f.write(formatted_item)

# chopped chords with 5 decimal places
# chopped_coords = coords[::1000]
# with open(doc_name + '.txt', 'w') as f:
#     for elements in coords:
#         formatted_items = [f"[{item:.6f}]" for item in elements]  # Keep 5 decimal places for each element
#         formatted_line = '[' + ', '.join([f"{item:.5f}" for item in elements]) + '],\n'
#         f.write(formatted_line)


# for waypoint in gpx.waypoints:
#     print(f'waypoint {waypoint.name} -> ({waypoint.latitude},{waypoint.longitude})')
#
# for route in gpx.routes:
#     print('Route:')
#     for point in route.points:
#         print(f'Point at ({point.latitude},{point.longitude}) -> {point.elevtion}')

# There are many more utility methods and functions:
# You can manipulate/add/remove tracks, segments, points, waypoints and routes and
# get the GPX XML file from the resulting object:

# print('GPX:', gpx.to_xml())

# Creating a new file:
# --------------------

# gpx = gpxpy.gpx.GPX()

# Create first track in our GPX:
# gpx_track = gpxpy.gpx.GPXTrack()
# gpx.tracks.append(gpx_track)

# Create first segment in our GPX track:
# gpx_segment = gpxpy.gpx.GPXTrackSegment()
# gpx_track.segments.append(gpx_segment)

# Create points:
# gpx_segment.points.append(gpxpy.gpx.GPXTrackPoint(2.1234, 5.1234, elevation=1234))
# gpx_segment.points.append(gpxpy.gpx.GPXTrackPoint(2.1235, 5.1235, elevation=1235))
# gpx_segment.points.append(gpxpy.gpx.GPXTrackPoint(2.1236, 5.1236, elevation=1236))
#
# You can add routes and waypoints, too...
#
# print('Created GPX:', gpx.to_xml())
#
