<?php
/*
	svc setgeo
	Save usergeo record.
*/
function setgeo() {
	$a = array(
		'status' => 'system-error'
	);

	// raw inputs
	$taint_si = isset($_POST['si']) ? $_POST['si'] : 0;
	$taint_id        = isset($_POST['id'       ]) ? $_POST['id'       ] : '';
	$taint_name      = isset($_POST['name'     ]) ? $_POST['name'     ] : '';
	$taint_layernm   = isset($_POST['layernm'  ]) ? $_POST['layernm'  ] : '';
	$taint_timebegin = isset($_POST['timebegin']) ? $_POST['timebegin'] : '';
	$taint_timeend   = isset($_POST['timeend'  ]) ? $_POST['timeend'  ] : '';
	$taint_geom      = isset($_POST['geom'     ]) ? $_POST['geom'     ] : '';

	// validate inputs
	$si = validateToken($taint_si);
	$id        = validateInt($taint_id);   // future use, to edit existing record
	$name      = validateName($taint_name);
	$layernm   = validateName($taint_layernm);
	$timebegin = validateTime($taint_timebegin);
	$timeend   = validateTime($taint_timeend);
	$geom      = validateGeom($taint_geom);

	// validate parameter set
	if (!($si && $name && $layernm && $timebegin && $timeend && $geom)) {
		Log::write(LOG_WARNING, 'attempt with invalid parameter set');
		return $a;
	}

	// get database connection
	$conn = getConnection();
	if (!$conn) {
		return $a;
	}

	// get logged-in user
	$result = getUserByToken($conn, $si);
	if (!$result) {
		return $a;
	}
	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	$userid = $row['id'];

	// insert or update usergeo
	$a['status'] = 'ok';
	if ($id) {
		$name = 'update-usergeo';
		$sql = "update geo.usergeo set name=$2, layernm=$3, timebegin=$4, timeend=$5, geom=$6 where id = $1";
		$params = array($userid,$name,$layernm,$timebegin,$timeend,$geom);
		$result = execSql($conn, $name, $sql, $params, true);
		if (!$result) {
			Log::write(LOG_NOTICE, "$name failed");
			$a['status'] = 'failed';
		}
	}
	else {
		$name = 'insert-usergeo';
		$sql = "insert into geo.usergeo (userid,name,layernm,timebegin,timeend,geom) values ($1,$2,$3,$4,$5,st_geomfromgeojson($6))";
		$params = array($userid,$name,$layernm,$timebegin,$timeend,$geom);
		$result = execSql($conn, $name, $sql, $params, true);
		if (!$result) {
			Log::write(LOG_NOTICE, "$name failed");
			$a['status'] = 'failed';
		}
	}

	// success
	return $a;
}

function validateInt($taint) {
	$clean = false;
 	$ok = preg_match('/^[0-9]{1,10}$/', $taint);
	if ($ok) {
		$clean = $taint;
	}
	return $clean;
}

function validateName($taint) {
	$clean = false;
 	$ok = preg_match('/^[a-zA-Z0-9\_\-.]{4,200}$/', $taint);
	if ($ok) {
		$clean = $taint;
	}
	return $clean;
}

function validateTime($taint) {
	$clean = false;
 	$ok = preg_match('/^[0-9\-\+]{2,20}$/', $taint);
	if ($ok) {
		$clean = $taint;
	}
	return $clean;
}

function validateGeom($taint) {
	$clean = false;
 	$ok = preg_match('/^[a-zA-Z0-9\=\:\{\}\(\)\[\]\_\-\.\,\"\']{4,9000}$/', $taint);
	if ($ok) {
		$clean = $taint;
	}
	return $clean;
}
?>
