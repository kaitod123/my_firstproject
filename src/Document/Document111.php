
<?php
 $dns = 'mysql:host=localhost;dbname=project';
 $username = 'root';
 $password = '12345678';

 try{
    $obj = new PDO($dns, $username, $password);
    echo "เชื่อมต่อสำเร็จไอเวร";
 }catch(PDOException $e){
    echo $e->getMessage();
 }
?>
