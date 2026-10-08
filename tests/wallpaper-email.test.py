import importlib.util
import unittest
from unittest.mock import patch
from pathlib import Path
spec = importlib.util.spec_from_file_location('server', Path(__file__).resolve().parents[1] / 'server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class EmailTests(unittest.TestCase):
 def test_all_wallpapers_have_correct_attachments(self):
  for slug in server.FIGURES:
   message=server.make_message('recipient@example.com',slug)
   attachment=list(message.iter_attachments())[0]
   self.assertEqual(attachment.get_filename(),f'slop-{slug}-wallpaper.png')
   self.assertEqual(attachment.get_payload(decode=True),(server.PUBLIC/'assets'/'wallpapers'/f'{slug}.png').read_bytes())
   self.assertEqual(message['To'],'recipient@example.com')
 def test_rejects_injection_and_unknown_assets(self):
  for payload in [None,{}, {'email':'a@example.com\r\nBcc: other@example.com','slug':'niu-lai'}, {'email':'a@example.com','slug':'../../.env.local'}, {'email':'a@example.com,b@example.com','slug':'niu-lai'}]:
   with self.assertRaises(ValueError):server.validate_request(payload)
 def test_gmail_encryption_and_sender(self):
  with patch.object(server.smtplib,'SMTP_SSL') as smtp:
   message=server.make_message('recipient@example.com','niu-lai')
   server.deliver(message,'testcredential')
   self.assertEqual(smtp.call_args.args,('smtp.gmail.com',465))
   client=smtp.return_value.__enter__.return_value
   client.login.assert_called_once_with(server.SENDER,'testcredential')
   client.send_message.assert_called_once_with(message)
 def test_rate_limit(self):
  limiter=server.RateLimit()
  self.assertTrue(limiter.allow('local'))
  self.assertFalse(limiter.allow('local'))

unittest.main()
