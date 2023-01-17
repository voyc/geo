<?php
/*
	svc search
	kw=search string
*/
function search() {
	$a = array(
		'status' => 'system-error'
	);

	// raw inputs
	$taint_kw = isset($_POST['kw']) ? $_POST['kw'] : 0;

	// validate inputs
	$kw = validateQString($taint_kw);

	// get database connection
	$conn = getConnection();
	if (!$conn) {
		return $a;
	}

	// read profile for logged-in user
	$id = '';
	$name = '';
	$pid = '';
	$qname = 'query-search';
	//$sql = "select id, name, pid, fc from plunder.names where lower(name) like $1;";
	$sql = "select id, name, featureclass, scalerank, timebegin, timeend ";
	$sql .= "from plunder.plunder where lower(name) like $1;";
	$params = array($kw.'%');
	$result = execSql($conn, $qname, $sql, $params, false);
	if ($result) {
		$matches = array();
		$numrows = pg_num_rows($result);
		for ($i=0; $i<$numrows; $i++) {
			$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
			$match = array();
			$match['id']  = $row['id'];
			$match['name']= $row['name'];
			$match['fc']  = $row['featureclass'];
			$match['sr']  = $row['scalerank'];
			$match['b']   = $row['timebegin'];
			$match['e']   = $row['timeend'];
			$matches[] = $match;
		}
	}
	else {
		$a['status'] = $kw.' not found';
		return $a;
	}

	Log::write(LOG_INFO, $kw." matching: ". pg_num_rows($result));

	// success
	$a['status'] = 'ok';
	$a['matches'] = $matches;
	return $a;
}

// search string must be all unicode characters, no sql or javascript
function validateQString($taint) {
	$clean = false;
 	$ok = true; //preg_match('/^[a-zA-Z0-9\_]{6,64}$/', $taint);
	if ($ok) {
		$clean = $taint;
	}
	return $clean;
}
?>
