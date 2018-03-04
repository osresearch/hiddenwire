
function tri_normal(p0,p1,p2)
{
	let v0 = p5.Vector.sub(p1, p0);
	let v1 = p5.Vector.sub(p2, p0);
	return v0.cross(v1).normalize();
}


function close_enough(p0,p1)
{
	let eps = 0.001;

	let dx = p0.x - p1.x;
	if (dx < -eps || eps < dx)
		return false;

	let dy = p0.y - p1.y;
	if (dy < -eps || eps < dy)
		return false;

	let dz = p0.z - p1.z;
	if (dz < -eps || eps < dz)
		return false;

	return true;
}


function Triangle(p0, p1, p2)
{

	this.model = [p0,p1,p2];
	this.normal = tri_normal(p0,p1,p2);

	// projection into the screen space and the camera generation
	// counter that was used to compute it
	this.generation = 0;
	this.screen = [];

	// bitmask of which of the three edges are coplanar
	// with other triangles
	this.coplanar = 0;

	// boolean for if this entire triangle is hidden due to
	// either off-screen or backface culling
	this.invisible = false;


	// compute the coordinates in screen space and decide
	// if it is onscreen or backfaced culled
	this.project = function (camera,generation)
	{
		this.generation = generation;
		this.invisible = true; // assume it will be discarded
		this.screen = [];

		let s0 = camera.project(this.model[0]);
		let s1 = camera.project(this.model[1]);
		let s2 = camera.project(this.model[2]);

		// if any of them are behind us or off screen,
		// mark this triangle as invisible
		if (!s0 || !s1 || !s2)
			return false;

		if((s0.x < -camera.width/2 || camera.width/2 < s0.x)
		|| (s0.y < -camera.height/2 || camera.height/2 < s0.y)
		|| (s1.x < -camera.width/2 || camera.width/2 < s1.x)
		|| (s1.y < -camera.height/2 || camera.height/2 < s1.y)
		|| (s2.x < -camera.width/2 || camera.width/2 < s2.x)
		|| (s2.y < -camera.height/2 || camera.height/2 < s2.y)
		)
			return false;

		// compute the screen normal and mark this triangle
		// as invisible if it is facing away from us
		let normal = tri_normal(s0,s1,s2);
		if (normal.z > 0)
			return false;

		// after all that, the triangle is visible
		this.screen = [s0,s1,s2];
		this.invisible = false;
		return true;
	};

	// determines if this triangle shares any edges with
	// other triangle.  returns a bitmask of the shared edges
	// this only needs to be done once when the STL is loaded
	// but does require N^2 time so it should be deferred
	this.coplanar_check = function (t)
	{
		// ignore t if it is the same triangle
		if (t === this)
			return 0;

		// if the normals aren't "close enough" then
		// they can't be coplanar
		if (!close_enough(this.normal, t.normal))
			return 0;

		// do we have any point matches?
		let matches = 0;
		for(let i = 0 ; i < 3 ; i++)
			for(let j = 0 ; j < 3 ; j++)
				if (close_enough(this.model[i], t.model[j]))
					matches |= 1 << i;

		// points 0 and 1 == edge 0
		if (matches == 0b011) return 1 << 0;

		// points 1 and 2 == edge 1
		if (matches == 0b110) return 1 << 1;

		// points 0 and 2 == edge 2
		if (matches == 0b101) return 1 << 2;

		// all three points match: we have a problem
		if (matches == 0b111)
			console.log("three points match? " + this + " " + t);

		return 0;
	}

	// process a list of triangles and update the coplanar field
	this.coplanar_update = function (triangles)
	{
		for(t of triangles)
		{
			let edges = this.coplanar_check(t);
			if (edges == 0)
				continue;

			this.coplanar |= edges;

			// if all three edges are matched, we can stop
			// searching since this triangle will not be
			// displayed anyway
			if (this.coplanar == 0b111)
				break;
		}
	}
}

