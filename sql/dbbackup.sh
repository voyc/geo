#
#  -Fp format plain-text SQL script file
#  -b  include blobs
#  -O  do NOT output commands to alter ownership of objects.  User running the command will have ownership of all the objects.
#  --column-inserts  dump data as insert statements with explicit column names
#
pg_dump -Fp -b -O --column-inserts -U voyccom_jhagstrand -n plunder -f /home/voyccom/db_backup/plunder-backup.`date +%Y%m%d`.`date +%H%M%S`.sql voyccom_plunder
echo "plunder.voyc backup completed"
