using System;
using System.Drawing;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using EsportManager.Controls;

namespace EsportManager
{
    public class RegistrationForm : Form
    {
        public string MachineName { get; private set; }
        public int Row { get; private set; }
        public int Position { get; private set; }
        public string AdminPassword { get; private set; }

        private ModernTextBox _nameBox;
        private ModernTextBox _rowBox;
        private ModernTextBox _posBox;
        private ModernTextBox _passBox;
        private Label _statusLabel;

        public RegistrationForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(400, 500);
            this.BackColor = UiColors.Card;
            this.Text = "Regisztráció";
            this.TopMost = true;

            // Add border
            this.Paint += (s, e) => ControlPaint.DrawBorder(e.Graphics, this.ClientRectangle, UiColors.Border, ButtonBorderStyle.Solid);

            InitializeUI();
        }

        private void InitializeUI()
        {
            var title = new Label
            {
                Text = "Gép Regisztráció",
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                ForeColor = UiColors.Foreground,
                Location = new Point(0, 30),
                Size = new Size(400, 40),
                TextAlign = ContentAlignment.MiddleCenter
            };

            var nameLabel = new Label { Text = "Gép Neve (pl. PC-1)", ForeColor = UiColors.Foreground, Location = new Point(50, 90), Size = new Size(300, 20) };
            _nameBox = new ModernTextBox { Location = new Point(50, 115), Size = new Size(300, 35) };
            _nameBox.Text = Environment.MachineName; // Default to hostname

            var rowLabel = new Label { Text = "Sor (0-tól)", ForeColor = UiColors.Foreground, Location = new Point(50, 160), Size = new Size(300, 20) };
            _rowBox = new ModernTextBox { Location = new Point(50, 185), Size = new Size(300, 35) };

            var posLabel = new Label { Text = "Pozíció (0-tól)", ForeColor = UiColors.Foreground, Location = new Point(50, 230), Size = new Size(300, 20) };
            _posBox = new ModernTextBox { Location = new Point(50, 255), Size = new Size(300, 35) };

            var passLabel = new Label { Text = "Admin Jelszó", ForeColor = UiColors.Foreground, Location = new Point(50, 300), Size = new Size(300, 20) };
            _passBox = new ModernTextBox { Location = new Point(50, 325), Size = new Size(300, 35), UseSystemPasswordChar = true };

            var submitBtn = new ModernButton
            {
                Text = "Regisztráció",
                Location = new Point(50, 380),
                Size = new Size(300, 45),
                StartColor = UiColors.Primary,
                EndColor = UiColors.NeonPink
            };
            submitBtn.Click += SubmitBtn_Click;

            var cancelBtn = new Button
            {
                Text = "Mégse (Kilépés)",
                Location = new Point(50, 435),
                Size = new Size(300, 30),
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.Gray,
                Font = new Font("Segoe UI", 9)
            };
            cancelBtn.FlatAppearance.BorderSize = 0;
            cancelBtn.Click += (s, e) => Application.Exit(); 

            _statusLabel = new Label
            {
                Text = "",
                ForeColor = UiColors.NeonPink,
                Location = new Point(0, 360), // Above button
                Size = new Size(400, 20),
                TextAlign = ContentAlignment.MiddleCenter
            };

            this.Controls.AddRange(new Control[] { 
                title, 
                nameLabel, _nameBox, 
                rowLabel, _rowBox, 
                posLabel, _posBox, 
                passLabel, _passBox, 
                submitBtn, cancelBtn, _statusLabel 
            });
        }

        private void SubmitBtn_Click(object? sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_nameBox.Text) || 
                string.IsNullOrWhiteSpace(_rowBox.Text) || 
                string.IsNullOrWhiteSpace(_posBox.Text) || 
                string.IsNullOrWhiteSpace(_passBox.Text))
            {
                _statusLabel.Text = "Minden mező kitöltése kötelező!";
                return;
            }

            if (!int.TryParse(_rowBox.Text, out int r) || !int.TryParse(_posBox.Text, out int p))
            {
                _statusLabel.Text = "A sor és pozíció szám kell legyen!";
                return;
            }

            MachineName = _nameBox.Text;
            Row = r;
            Position = p;
            AdminPassword = _passBox.Text;

            this.DialogResult = DialogResult.OK;
            this.Close();
        }
    }
}
